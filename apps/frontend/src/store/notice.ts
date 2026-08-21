import { makeAutoObservable } from 'mobx';

export class NoticeStore {
	message: string = '';
	visible: boolean = false;
	pageLoading: boolean = false;

	constructor() {
		makeAutoObservable(this);
	}

	show(message: string) {
		this.message = message;
		this.visible = true;
	}

	hide() {
		this.visible = false;
		this.message = '';
	}

	setPageLoading(v: boolean) {
		this.pageLoading = v;
	}
}
