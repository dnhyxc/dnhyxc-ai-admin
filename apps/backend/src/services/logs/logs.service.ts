import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Logs } from './logs.entity';

@Injectable()
export class LogsService {
	constructor(
		@InjectRepository(Logs)
		private readonly logsRepository: Repository<Logs>,
	) {}

	async create(partial: Partial<Logs>) {
		const log = this.logsRepository.create(partial);
		return this.logsRepository.save(log);
	}

	async findAll(pageNo = 1, pageSize = 20) {
		const take = pageSize;
		const skip = (pageNo - 1) * take;
		const [list, total] = await this.logsRepository.findAndCount({
			relations: ['user'],
			order: { id: 'DESC' },
			take,
			skip,
		});
		return { list, total };
	}

	async remove(ids: number[]) {
		if (!ids.length) return { affected: 0 };
		const result = await this.logsRepository.delete({ id: In(ids) });
		return { affected: result.affected ?? 0 };
	}

	count(): Promise<number> {
		return this.logsRepository.count();
	}
}
