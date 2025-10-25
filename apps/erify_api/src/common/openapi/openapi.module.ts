import { Module } from '@nestjs/common';

@Module({})
export class OpenAPIModule {
  static forRoot() {
    return {
      module: OpenAPIModule,
      providers: [],
      exports: [],
    };
  }
}
