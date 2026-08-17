import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailEnum } from '../../enum/config.enum';
import { getEnvConfig } from '../../utils';

const config = getEnvConfig();

@Module({
	imports: [
		MailerModule.forRootAsync({
			useFactory: () => ({
				transport: config[EmailEnum.EMAIL_TRANSPORT],
				defaults: {
					from: `"dnhyxc-ai-admin" <${config[EmailEnum.EMAIL_FROM]}>`,
				},
			}),
		}),
	],
})
export class MailModule {}
