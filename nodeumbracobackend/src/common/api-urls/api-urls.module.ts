import { Module } from '@nestjs/common';
import { ApiUrlsService } from './api-urls.service';

@Module({
  providers: [ApiUrlsService],
  exports: [ApiUrlsService],
})
export class ApiUrlsModule {}
