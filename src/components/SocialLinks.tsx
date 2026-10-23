import type { PublicLink } from "../api/types";

const PLATFORMS = [
  "instagram",
  "tiktok",
  "facebook",
  "whatsapp",
  "x",
  "youtube",
  "website",
  "other",
] as const;

type Platform = (typeof PLATFORMS)[number];

function platformOf(value: string): Platform {
  const name = value.trim().toLowerCase();
  return PLATFORMS.includes(name as Platform) ? (name as Platform) : "other";
}

function Glyph({ platform }: { platform: Platform }) {
  if (platform === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="1.6" y="1.6" width="20.8" height="20.8" rx="6" fill="none" stroke="currentColor" strokeWidth="2.15" />
        <circle cx="12" cy="12" r="4.7" fill="none" stroke="currentColor" strokeWidth="2.15" />
        <circle cx="17.7" cy="6.3" r="1.25" fill="currentColor" />
      </svg>
    );
  }

  if (platform === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M14.2 3.2c.5 2.7 2.1 4.5 4.6 5v2.4c-1.6 0-3-.5-4.3-1.4v6.5c0 3.4-2.6 5.9-6 5.9S2.5 19.1 2.5 15.7c0-3.3 2.5-5.8 5.8-5.9v2.6c-1.7.1-3.1 1.5-3.1 3.3 0 1.8 1.5 3.3 3.3 3.3s3.3-1.5 3.3-3.3V3.2h2.4z"
        />
      </svg>
    );
  }

  if (platform === "facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M14.3 20.5v-7.1h2.4l.4-2.8h-2.8V8.9c0-.8.2-1.4 1.4-1.4h1.5V5c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2h-2.5v2.8h2.5v7.1h3z"
        />
      </svg>
    );
  }

  if (platform === "whatsapp") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12.1 3.4a8.4 8.4 0 0 0-7.2 12.6L4 20.6l4.7-.9a8.4 8.4 0 1 0 3.4-16.3zm4.9 11.9c-.2.6-1.2 1.1-1.7 1.2-.4.1-1 .1-1.6-.1-.4-.1-.8-.3-1.4-.5-2.4-1-4-3.5-4.1-3.7-.2-.2-1.3-1.7-1.3-3.2s.8-2.3 1.1-2.6c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5.2.6.8 2 .8 2.1.1.2 0 .3-.1.5l-.4.5c-.1.2-.3.3-.1.6.2.3.7 1.2 1.6 1.9.1.1 1.1 1 2.2 1.3.2 0 .4 0 .5-.1.2-.2.5-.6.6-.8.1-.2.3-.2.5-.1.2.1 1.4.7 1.6.8.2.1.4.2.4.3.1.3 0 .9-.2 1.4z"
        />
      </svg>
    );
  }

  if (platform === "x") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4.2 4.6h3.3l4 5.4 4.6-5.4h3.1l-6.1 7 6.5 7.8h-3.3l-4.4-5.8-5 5.8H3.6l6.5-7.5-5.9-7.3z"
        />
      </svg>
    );
  }

  if (platform === "youtube") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M21.2 8.1a2.6 2.6 0 0 0-1.8-1.9C17.7 5.8 12 5.8 12 5.8s-5.7 0-7.4.4a2.6 2.6 0 0 0-1.8 1.9A27 27 0 0 0 2.4 12a27 27 0 0 0 .4 3.9 2.6 2.6 0 0 0 1.8 1.9c1.7.4 7.4.4 7.4.4s5.7 0 7.4-.4a2.6 2.6 0 0 0 1.8-1.9 27 27 0 0 0 .4-3.9 27 27 0 0 0-.4-3.9zM10.2 15.1V8.9L15.5 12l-5.3 3.1z"
        />
      </svg>
    );
  }

  if (platform === "website") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <ellipse cx="12" cy="12" rx="3.6" ry="8.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 12h16M5.2 8.2h13.6M5.2 15.8h13.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M10.2 13.8a4.2 4.2 0 0 0 6-.2l2.3-2.3a4.2 4.2 0 0 0-6-6L11 6.8"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M13.8 10.2a4.2 4.2 0 0 0-6 .2l-2.3 2.3a4.2 4.2 0 0 0 6 6L13 17.2"
      />
    </svg>
  );
}

export function SocialLinks({ links }: { links: PublicLink[] }) {
  return (
    <ul className="socials">
      {links.map((link) => {
        const platform = platformOf(link.platform);
        return (
          <li key={link.id}>
            <a
              className={`social-link ${platform}`}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              aria-label={link.label}
            >
              <Glyph platform={platform} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
