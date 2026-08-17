import type { TablePaginationConfig } from 'antd';

export const DEFAULT_PAGE_SIZE = 20;

/** antd Table 全功能分页器 */
export function tablePagination(
	total: number,
	pageNo: number,
	pageSize: number,
	onChange: (page: number, size: number) => void,
): TablePaginationConfig {
	return {
		current: pageNo,
		pageSize,
		total,
		showSizeChanger: true,
		showQuickJumper: true,
		showLessItems: false,
		pageSizeOptions: ['10', '20', '50', '100'],
		showTotal: (t, range) => `第 ${range[0]}-${range[1]} 条 / 共 ${t} 条`,
		onChange,
		onShowSizeChange: onChange,
	};
}
