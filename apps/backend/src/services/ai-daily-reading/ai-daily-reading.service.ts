import {
	BadGatewayException,
	BadRequestException,
	Injectable,
	NotFoundException,
	ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { DB_CONNECTIONS } from '../../database/constants';
import { AiDailyReading } from './ai-daily-reading.entity';
import { AiDailyReadingAttempt } from './ai-daily-reading-attempt.entity';

const DAY = 'day';
const GENERATING_MS = 3 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const REASON_TEXT: Record<string, string> = {
	future: '只能补今天及以前',
	ready: '这一天已经生成',
	busy: '正在生成，请稍后再试',
	cooldown: '刚刚失败，请几秒后再试',
};

function shanghaiToday(now = new Date()): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Shanghai',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(now);
}

function eachDate(start: string, end: string): string[] {
	const out: string[] = [];
	const cur = new Date(`${start}T00:00:00Z`);
	const last = new Date(`${end}T00:00:00Z`);
	while (cur.getTime() <= last.getTime()) {
		out.push(cur.toISOString().slice(0, 10));
		cur.setUTCDate(cur.getUTCDate() + 1);
	}
	return out;
}

function gapStatus(
	row: AiDailyReading | undefined,
	now: number,
): 'missing' | 'generating' | 'exhausted' | 'failed' | 'ready' {
	if (!row) return 'missing';
	if (row.status === 'ready') return 'ready';
	if (row.status === 'pending') return 'generating';
	if (row.status !== 'failed') return 'failed';
	if ((row.attemptCount ?? 0) >= MAX_ATTEMPTS) return 'exhausted';
	const age = now - new Date(row.startedAt).getTime();
	if (age < GENERATING_MS) return 'generating';
	return 'failed';
}

@Injectable()
export class AiDailyReadingService {
	constructor(
		@InjectRepository(AiDailyReading, DB_CONNECTIONS.AI)
		private readonly days: Repository<AiDailyReading>,
		@InjectRepository(AiDailyReadingAttempt, DB_CONNECTIONS.AI)
		private readonly attempts: Repository<AiDailyReadingAttempt>,
	) {}

	async listGaps() {
		const today = shanghaiToday();
		const earliest = await this.days
			.createQueryBuilder('row')
			.select('MIN(row.publishDate)', 'min')
			.where('row.slot = :slot', { slot: DAY })
			.getRawOne<{ min: string | null }>();
		const start = earliest?.min;
		if (!start || start > today) return [];
		const rows = await this.days.find({
			where: { slot: DAY, publishDate: Between(start, today) },
		});
		const byDate = new Map(rows.map((row) => [row.publishDate, row]));
		const sums = await this.attempts
			.createQueryBuilder('row')
			.select('row.publishDate', 'publishDate')
			.addSelect('COALESCE(SUM(row.tokens), 0)', 'tokens')
			.addSelect('MAX(row.enqueuedAt)', 'enqueuedAt')
			.where('row.publishDate BETWEEN :start AND :today', { start, today })
			.groupBy('row.publishDate')
			.getRawMany<{
				publishDate: string;
				tokens: string;
				enqueuedAt: string | null;
			}>();
		const usage = new Map(sums.map((row) => [row.publishDate, row]));
		const now = Date.now();
		return eachDate(start, today)
			.map((publishDate) => {
				const row = byDate.get(publishDate);
				const status = gapStatus(row, now);
				const used = usage.get(publishDate);
				return {
					publishDate,
					status,
					theme: row?.theme ?? '',
					attemptCount: row?.attemptCount ?? 0,
					lastError: row?.lastError ?? null,
					tokens: Number(used?.tokens ?? 0),
					enqueuedAt: used?.enqueuedAt ?? null,
				};
			})
			.filter((row) => row.status !== 'ready')
			.reverse();
	}

	/** 已经写成 ready 的系统日推。手动篇 slot 不是 day，不在这里。 */
	async listReady() {
		const rows = await this.days.find({
			where: { slot: DAY, status: 'ready' },
			order: { publishDate: 'DESC' },
		});
		if (!rows.length) return [];
		const usage = await this.tokenUsage(rows.map((row) => row.publishDate));
		return rows.map((row) => ({
			publishDate: row.publishDate,
			status: 'ready' as const,
			theme: row.theme,
			titleEn: row.titleEn,
			titleZh: row.titleZh,
			attemptCount: row.attemptCount ?? 0,
			tokens: usage.get(row.publishDate)?.tokens ?? 0,
			createdAt: row.createdAt,
		}));
	}

	async getDay(publishDate: string) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) {
			throw new BadRequestException('日期无效');
		}
		const row = await this.days.findOne({
			where: { publishDate, slot: DAY },
		});
		const attempts = await this.attempts.find({
			where: { publishDate },
			order: { attemptNo: 'ASC' },
		});
		const lastFail = [...attempts]
			.reverse()
			.find((item) => item.outcome === 'failed');
		return {
			publishDate,
			status: gapStatus(row ?? undefined, Date.now()),
			theme: row?.theme ?? '',
			titleEn: row?.titleEn ?? '',
			titleZh: row?.titleZh ?? '',
			attemptCount: row?.attemptCount ?? 0,
			lastError: lastFail?.reason ?? (attempts.length ? null : '尚未生成'),
			passage:
				row?.status === 'ready'
					? {
							titleEn: row.titleEn,
							titleZh: row.titleZh,
							bodyEn: row.bodyEn,
							bodyZh: row.bodyZh,
							sourceKind: row.sourceKind,
							sourceUrl: row.sourceUrl,
							sourceTitle: row.sourceTitle,
							extras: row.extras,
						}
					: null,
			attempts,
		};
	}

	private async tokenUsage(dates: string[]) {
		const sums = await this.attempts
			.createQueryBuilder('row')
			.select('row.publishDate', 'publishDate')
			.addSelect('COALESCE(SUM(row.tokens), 0)', 'tokens')
			.where('row.publishDate IN (:...dates)', { dates })
			.groupBy('row.publishDate')
			.getRawMany<{ publishDate: string; tokens: string }>();
		return new Map(
			sums.map((row) => [row.publishDate, { tokens: Number(row.tokens) }]),
		);
	}

	/** 只删已成功的系统日推。尝试记录一起删，这一天会回到失败列表里的缺失。 */
	async removeReady(publishDate: string) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) {
			throw new BadRequestException('日期无效');
		}
		const row = await this.days.findOne({
			where: { publishDate, slot: DAY },
		});
		if (!row) throw new NotFoundException('这一天没有日推');
		if (row.status !== 'ready') {
			throw new BadRequestException('只能删除已生成成功的日推');
		}
		await this.attempts.delete({ publishDate });
		await this.days.delete({ id: row.id });
		return { ok: true };
	}

	async backfill(publishDate: string) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) {
			throw new BadRequestException('日期无效');
		}
		const base = process.env.DAILY_READING_INTERNAL_BASE_URL?.replace(
			/\/$/,
			'',
		);
		const token = process.env.DAILY_READING_INTERNAL_TOKEN;
		if (!base || !token) {
			throw new ServiceUnavailableException('未配置日推补生成地址');
		}
		let res: Response;
		try {
			res = await fetch(`${base}/api/internal/daily-reading/backfill`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'x-internal-token': token,
				},
				body: JSON.stringify({ publishDate }),
				signal: AbortSignal.timeout(5000),
			});
		} catch {
			throw new BadGatewayException(`主项目暂时连不上：${base}`);
		}
		const data = (await res.json().catch(() => null)) as {
			ok?: boolean;
			queued?: boolean;
			reason?: string;
			message?: string;
		} | null;
		if (res.status === 401) {
			throw new BadGatewayException(
				'主项目拒绝了密钥。请确认两边的 DAILY_READING_INTERNAL_TOKEN 相同，并且主项目已重启',
			);
		}
		if (!res.ok) {
			throw new BadGatewayException(
				data?.message || `补生成失败（主项目 ${res.status}）`,
			);
		}
		if (!data?.ok) {
			throw new BadRequestException(
				REASON_TEXT[data?.reason ?? ''] || '未能入队',
			);
		}
		return { queued: true };
	}
}
