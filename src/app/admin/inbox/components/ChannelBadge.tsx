import { Share2, Camera, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const channelConfig: Record<
  string,
  {
    label: string;
    className: string;
    dotClassName: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  WHATSAPP_BAILEYS: {
    label: "WhatsApp",
    className: "channel-whatsapp",
    dotClassName: "bg-[#25d366]",
    icon: MessageCircle,
  },
  WHATSAPP_CLOUD: {
    label: "WhatsApp",
    className: "channel-whatsapp",
    dotClassName: "bg-[#25d366]",
    icon: MessageCircle,
  },
  FACEBOOK_PAGE: {
    label: "Facebook",
    className: "channel-facebook",
    dotClassName: "bg-[#1877f2]",
    icon: Share2,
  },
  INSTAGRAM: {
    label: "Instagram",
    className: "channel-instagram",
    dotClassName: "bg-[#e1306c]",
    icon: Camera,
  },
};

export function ChannelBadge({ type }: { type: string }) {
  const cfg = channelConfig[type] ?? channelConfig.WHATSAPP_BAILEYS;
  const Icon = cfg.icon;
  return (
    <Badge className={cn("gap-1 bg-transparent", cfg.className)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

/** Small round channel indicator, meant to sit on an avatar's corner. */
export function ChannelDot({ type, className }: { type: string; className?: string }) {
  const cfg = channelConfig[type] ?? channelConfig.WHATSAPP_BAILEYS;
  const Icon = cfg.icon;
  return (
    <span
      title={cfg.label}
      className={cn(
        "flex h-4 w-4 items-center justify-center rounded-full border-2 border-card text-white",
        cfg.dotClassName,
        className
      )}
    >
      <Icon className="h-2 w-2" />
    </span>
  );
}
