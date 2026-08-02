export default {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'type-enum': [
			2,
			'always',
			[
				'feat',
				'fix',
				'bug',
				'ui',
				'docs',
				'style',
				'perf',
				'release',
				'deploy',
				'refactor',
				'test',
				'chore',
				'revert',
				'merge',
				'other',
				'build',
			],
		],
	},
};
