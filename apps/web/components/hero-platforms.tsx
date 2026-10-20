import type { CSSProperties } from "react";
import styles from "./hero-platforms.module.css";

// Bootstrap Icons (MIT), Simple Icons (CC0), and VKCOM/icons (MIT).
// Source licenses are bundled alongside the SVG assets.
const platforms = [
  "youtube",
  "instagram",
  "tiktok",
  "facebook",
  "twitter-x",
  "bilibili",
  "vk-video",
  "giphy",
];

export function HeroPlatforms() {
  return (
    <div aria-hidden="true" data-testid="hero-platforms" className={styles.platforms}>
      {platforms.map((platform) => (
        <span
          key={platform}
          data-platform={platform}
          className={styles.platform}
          style={
            { "--platform-icon": `url(/platforms/${platform}.svg)` } as CSSProperties
          }
        >
          <span className={styles.icon} />
        </span>
      ))}
    </div>
  );
}
