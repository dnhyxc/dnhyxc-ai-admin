import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigEnum } from '../../enum/config.enum';
import { LogsModule } from '../logs/logs.module';
import { Roles } from '../roles/roles.entity';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './auth.strategy';

@Global()
@Module({
	imports: [
		UserModule,
		LogsModule,
		TypeOrmModule.forFeature([Roles]),
		PassportModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			useFactory: (configService: ConfigService) => ({
				secret: configService.get(ConfigEnum.SECRET),
				signOptions: { expiresIn: '7d' },
			}),
			inject: [ConfigService],
		}),
	],
	providers: [AuthService, JwtStrategy],
	controllers: [AuthController],
	exports: [AuthService],
})
export class AuthModule {}
