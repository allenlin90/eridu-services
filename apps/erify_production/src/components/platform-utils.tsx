import { LazadaIcon } from "@/components/icons/lazada-icon";
import { ShopeeIcon } from "@/components/icons/shopee-icon";
import { TikTokIcon } from "@/components/icons/tiktok-icon";
import { YoutubeIcon } from "@/components/icons/youtube-icon";

export function getPlatformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case "lazada":
      return LazadaIcon;
    case "shopee":
      return ShopeeIcon;
    case "tiktok":
      return TikTokIcon;
    case "youtube":
      return YoutubeIcon;
    default:
      return ShopeeIcon;
  }
}
