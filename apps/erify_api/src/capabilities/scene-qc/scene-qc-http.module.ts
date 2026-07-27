import { Module } from '@nestjs/common';

import { StudioSceneProfileController } from './http/studio-scene-profile.controller';
import { SceneQcModule } from './scene-qc.module';

import { ClientModule } from '@/models/client/client.module';
import { ShowModule } from '@/models/show/show.module';

@Module({
  imports: [SceneQcModule, ClientModule, ShowModule],
  controllers: [StudioSceneProfileController],
})
export class SceneQcHttpModule {}
