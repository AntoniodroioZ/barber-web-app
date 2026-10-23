import { useId, useMemo, type ReactNode } from "react";
import QRCode from "qrcode";
import logoUrl from "../assets/icon-kuttly.png";
import { kuttlyQr } from "../lib/kuttly-qr-colors";

const FINDER = 7;

type DotMatrix = boolean[][];

function buildMatrix(value: string): DotMatrix {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: "H" });
  const n = modules.size;
  const rows: DotMatrix = [];
  for (let r = 0; r < n; r += 1) {
    const row: boolean[] = [];
    for (let c = 0; c < n; c += 1) {
      row.push(Boolean(modules.get(r, c)));
    }
    rows.push(row);
  }
  return rows;
}

function inFinder(row: number, col: number, n: number) {
  if (row < FINDER && col < FINDER) return true;
  if (row < FINDER && col >= n - FINDER) return true;
  if (row >= n - FINDER && col < FINDER) return true;
  return false;
}

function inLogoClearance(row: number, col: number, n: number, clearance: number) {
  const start = Math.floor((n - clearance) / 2);
  const end = start + clearance;
  return row >= start && row < end && col >= start && col < end;
}

type FinderProps = {
  x: number;
  y: number;
  module: number;
  fill: string;
  background: string;
};

function FinderEye({ x, y, module, fill, background }: FinderProps) {
  const size = module * FINDER;
  return (
    <>
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        rx={module * 2}
        ry={module * 2}
        fill={fill}
      />
      <rect
        x={x + module}
        y={y + module}
        width={module * 5}
        height={module * 5}
        rx={module * 1.4}
        ry={module * 1.4}
        fill={background}
      />
      <circle cx={x + size / 2} cy={y + size / 2} r={module * 1.55} fill={fill} />
    </>
  );
}

type BrandedQrProps = {
  value: string;
  size?: number;
  title?: string;
};

export function BrandedQr({ value, size = 220, title }: BrandedQrProps) {
  const reactId = useId().replace(/:/g, "");
  const gradientId = `kuttly-qr-grad-${reactId}`;
  const matrix = useMemo(() => buildMatrix(value), [value]);
  const n = matrix.length;
  const module = size / n;
  const logoClearance = Math.max(FINDER, Math.ceil(n * 0.3));
  const logoBox = module * logoClearance;
  const logoOffset = (size - logoBox) / 2;
  const logoPad = module * 0.55;
  const logoInner = logoBox - logoPad * 2;
  const radius = module * 0.38;
  const fill = `url(#${gradientId})`;

  const dots = useMemo(() => {
    const nodes: ReactNode[] = [];
    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < n; c += 1) {
        if (!matrix[r]?.[c]) continue;
        if (inFinder(r, c, n)) continue;
        if (inLogoClearance(r, c, n, logoClearance)) continue;
        nodes.push(
          <circle
            key={`${r}-${c}`}
            cx={c * module + module / 2}
            cy={r * module + module / 2}
            r={radius}
            fill={fill}
          />,
        );
      }
    }
    return nodes;
  }, [matrix, n, module, radius, logoClearance, fill]);

  return (
    <svg
      className="branded-qr"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={title ?? "Código QR"}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={kuttlyQr.purple} />
          <stop offset="0.48" stopColor={kuttlyQr.indigo} />
          <stop offset="1" stopColor={kuttlyQr.teal} />
        </linearGradient>
      </defs>

      <rect width={size} height={size} fill={kuttlyQr.paper} />

      <FinderEye x={0} y={0} module={module} fill={fill} background={kuttlyQr.paper} />
      <FinderEye
        x={(n - FINDER) * module}
        y={0}
        module={module}
        fill={fill}
        background={kuttlyQr.paper}
      />
      <FinderEye
        x={0}
        y={(n - FINDER) * module}
        module={module}
        fill={fill}
        background={kuttlyQr.paper}
      />
      {dots}

      <rect
        x={logoOffset + logoPad}
        y={logoOffset + logoPad}
        width={logoInner}
        height={logoInner}
        rx={logoInner * 0.22}
        ry={logoInner * 0.22}
        fill={kuttlyQr.ink}
      />
      <image
        href={logoUrl}
        x={logoOffset + logoPad}
        y={logoOffset + logoPad}
        width={logoInner}
        height={logoInner}
        preserveAspectRatio="xMidYMid slice"
      />
    </svg>
  );
}
