import { DiscordResolve } from '../interface/discord-resolve';
import { ClientEvents } from 'discord.js';
import { ON_DECORATOR, USE_INTERCEPTORS_DECORATOR } from '../constant/discord.constant';
import { DiscordClient, OnDecoratorOptions } from '..';
import { DiscordResolveOptions } from '../interface/discord-resolve-options';
import { DiscordMiddlewareService } from '../service/discord-middleware.service';
import { Injectable } from '@nestjs/common';
import { DiscordInterceptor } from '..';
import { DiscordInterceptorService } from '../service/discord-interceptor.service';

@Injectable()
export class OnResolver implements DiscordResolve {
  constructor(
    private readonly discordMiddlewareService: DiscordMiddlewareService,
    private readonly discordInterceptorService: DiscordInterceptorService
  ) {
  }

  resolve(options: DiscordResolveOptions): void {
    const { discordClient, instance, methodName, middlewareList } = options;
    const metadata: OnDecoratorOptions = Reflect.getMetadata(ON_DECORATOR, instance, methodName);
    const interceptors: (DiscordInterceptor | Function)[] = Reflect.getMetadata(USE_INTERCEPTORS_DECORATOR, instance, methodName);
    if (metadata) {
      discordClient.on(metadata.event, async (...data: ClientEvents[keyof ClientEvents]) => {
        if (!this.isAllowGuild(discordClient, data)) {
          return;
        }
        if (this.isDenyGuild(discordClient, data)) {
          return;
        }
        await this.discordMiddlewareService.applyMiddleware(middlewareList, metadata.event, data);
        if (interceptors && interceptors.length !== 0) {
          data = await this.discordInterceptorService.applyInterceptors(interceptors, metadata.event, data);
        }
        instance[methodName](...data);
      });
    }
  }

  private isAllowGuild(discordClient: DiscordClient, data: any[] = []): boolean {
    const guild = data.find((item) => !!item && !!item.guild);
    const guildId = !!guild && guild.guild.id;
    if (!!guildId) {
      return discordClient.isAllowGuild(guildId);
    }
    return true;
  }

  private isDenyGuild(discordClient: DiscordClient, data: any[] = []): boolean {
    const guild = data.find((item) => !!item && !!item.guild);
    const guildId = !!guild && guild.guild.id;
    if (!!guildId) {
      return discordClient.isDenyGuild(guildId);
    }
    return false;
  }
}
