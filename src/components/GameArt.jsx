function Block({
  x,
  y,
  size = 36,
  top = "#b5a2ff",
  left = "#7762bd",
  right = "#4c3a87",
  depth = 22,
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d={`M0 0 ${size} ${-size / 2} ${size * 2} 0 ${size} ${size / 2}Z`}
        fill={top}
      />
      <path d={`M0 0v${depth}l${size} ${size / 2}v-${depth}Z`} fill={left} />
      <path
        d={`m${size} ${size / 2} ${size} ${-size / 2}v${depth}l-${size} ${size / 2}Z`}
        fill={right}
      />
    </g>
  );
}

function Gem({ x, y, color = "#fbc77a" }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="m0-14 10 10L0 13-10-4Z" fill={color} />
      <path d="m0-14 10 10H0Z" fill="#fff1d4" />
      <path d="M0-4v17L10-4Z" fill="#d68949" />
    </g>
  );
}

export default function GameArt({ mode = "3d", className = "" }) {
  return (
    <svg
      className={`game-art ${className}`}
      viewBox="0 0 600 400"
      fill="none"
      aria-hidden="true"
    >
      <path d="M50 330 300 205l250 125-250 125Z" fill="#a697f5" opacity=".04" />
      {[
        [60, 65],
        [115, 200],
        [220, 42],
        [375, 66],
        [527, 100],
        [500, 287],
        [90, 300],
        [425, 350],
      ].map(([x, y]) => (
        <g key={x} stroke="#b7b0df" opacity=".5">
          <path d={`M${x - 3} ${y}h6m-3-3v6`} />
        </g>
      ))}
      {mode === "3d" ? (
        <>
          <ellipse
            cx="315"
            cy="330"
            rx="190"
            ry="32"
            fill="#090d20"
            opacity=".7"
          />
          <path d="m147 222 155-78 170 85-155 78Z" fill="#d0bcff" />
          <path d="M147 222v47l170 85v-47Z" fill="#6153a1" />
          <path d="m317 307 155-78v47l-155 78Z" fill="#3e3674" />
          <path d="m147 222 155-78 170 85-155 78Z" fill="#8a79cf" />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} opacity=".24" stroke="#d2c2ff">
              <path d={`m${147 + i * 31} ${222 - i * 15.6} 170 85`} />
              <path d={`m${147 + i * 34} ${222 + i * 17} 155-78`} />
            </g>
          ))}
          <path d="m170 230 62-31 93 47 61-31 49 24-118 59Z" fill="#b3a1ec" />
          <Block x={414} y={158} size={30} depth={24} />
          <Block x={88} y={291} size={28} depth={30} />
          <g transform="translate(340 172)">
            <path
              d="m0 0 63-31 17 9v77l-16 8V-4L16 20v55L0 67Z"
              fill="#ea9b69"
            />
            <path d="m16 20 48-24v63L16 83Z" fill="#ffbb84" opacity=".15" />
            <path d="m21 23 38-19v53L21 76Z" fill="#ffbf8e" opacity=".28" />
            <path d="m26 27 28-14v40L26 67Z" fill="#ffddba" opacity=".35" />
            <path d="m0 0 16 8 64-32-17-8Z" fill="#ffd0a7" />
            <path d="m16 8 48-24v12L16 20Z" fill="#ffc399" />
          </g>
          <g transform="translate(254 190)">
            <path d="m0 25 17-9 25 13-18 9Z" fill="#40375e" opacity=".6" />
            <path d="M5 15v17l8 4V19Zm18 5v16l8-4V16Z" fill="#ffb47d" />
            <Block
              x={0}
              y={0}
              size={18}
              top="#fff1d4"
              left="#f1bc85"
              right="#d98e67"
              depth={24}
            />
            <path d="m26 3 6-3v6l-6 3Z" fill="#232543" />
            <path d="m16 8 5-2v6l-5 2Z" fill="#232543" />
            <path d="m4-3 14-7 14 7-14 7Z" fill="#f0a06b" />
          </g>
          <g fill="#607fa0">
            <path d="m193 152 22-57 21 57-21 12Z" />
            <path d="m404 241 22-57 21 57-21 12Z" />
            <path d="m329 127 15-42 16 42-16 9Z" />
          </g>
          <g fill="#394e76">
            <path d="m215 95 21 57-21 12Z" />
            <path d="m426 184 21 57-21 12Z" />
          </g>
          <Gem x={196} y={211} />
          <Gem x={327} y={267} />
          <Gem x={396} y={132} />
          <Gem x={126} y={252} color="#b5a0ff" />
          <path
            d="m150 311 16-8m4-2 5-2M438 179l14-7m5-2 5-3"
            stroke="#b3a1ec"
            strokeWidth="2"
            opacity=".5"
          />
        </>
      ) : (
        <g shapeRendering="crispEdges">
          <path d="M58 306h484v11H58Z" fill="#404b78" />
          <path d="M58 317h484v26H58Z" fill="#242e50" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
            <path key={i} d={`M${63 + i * 41} 321h28v5h-28Z`} fill="#303c60" />
          ))}
          <path
            d="M112 227h118v11H112Zm250-48h116v11H362ZM253 262h93v11h-93Z"
            fill="#aa99eb"
          />
          <path
            d="M112 238h118v17H112Zm250-48h116v17H362ZM253 273h93v17h-93Z"
            fill="#51497f"
          />
          <path
            d="M180 84h25v10h15v30h-15v10h-25v-10h-15V94h15Z"
            fill="#ffcb86"
          />
          <path d="M184 94h18v30h-18Z" fill="#ffe5b8" />
          <path
            d="M396 94h25v10h15v30h-15v10h-25v-10h-15v-30h15Z"
            fill="#ffcb86"
          />
          <path d="M400 104h18v30h-18Z" fill="#ffe5b8" />
          <g transform="translate(270 171)">
            <path d="M0 0h44v12h12v32H44v12H0V44h-12V12H0Z" fill="#b7a4ff" />
            <path d="M0 0h44v12H0Z" fill="#d8cbff" />
            <path d="M25 16h9v10h-9Zm18 0h9v10h-9Z" fill="#191c34" />
            <path d="M0 56h15v15H0Zm29 0h15v15H29Z" fill="#8472cb" />
            <path d="M1 36h43v8H1Z" fill="#8d7bcc" />
          </g>
          <g fill="#668c9f">
            <path d="M85 283h15v23H85Zm-8 5h31v10H77Z" />
            <path d="M462 275h15v31h-15Zm-9 7h33v11h-33Z" />
          </g>
          <path d="M268 116h8v-8h8v8h8v8h-8v8h-8v-8h-8Z" fill="#b3a0ff" />
          <path
            d="M88 139h35v7H88Zm9-7h19v7H97Zm382 98h36v7h-36Zm9-7h19v7h-19Z"
            fill="#505d83"
          />
        </g>
      )}
    </svg>
  );
}
