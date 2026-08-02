/**
 * ponytail: 最小自检 — 环境布尔解析（数据库开关依赖此函数）
 * 运行: npx tsx src/utils/parse-boolean.check.ts
 */
import { parseBoolean } from './index';

const cases: Array<[unknown, boolean, boolean]> = [
	['true', false, true],
	['false', true, false],
	['1', false, true],
	[true, false, true],
	[undefined, true, true],
	[undefined, false, false],
];

for (const [input, fallback, expected] of cases) {
	const got = parseBoolean(input, fallback);
	if (got !== expected) {
		throw new Error(
			`parseBoolean(${JSON.stringify(input)}, ${fallback}) => ${got}, expected ${expected}`,
		);
	}
}

console.log('parseBoolean check ok');
