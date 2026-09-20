import { Module } from '@nestjs/common';
import { EbankitAuthService } from './ebankit-auth.service';

@Module({
  providers: [EbankitAuthService],
  exports: [EbankitAuthService],
})
export class AuthModule {}
