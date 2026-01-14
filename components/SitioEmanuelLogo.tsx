import React from "react";

type Props = {
  className?: string;
  title?: string;
};

export default function SitioEmanuelLogo({
  className = "",
  title = "Sítio Emanuel — Deus Conosco",
}: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 920 260"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>

      {/* Tudo branco pra funcionar no tema escuro */}
      <g fill="none" stroke="white" strokeLinecap="round" strokeLinejoin="round">
        {/* Tronco + galhos (estilizado) */}
        <path
          d="M180 210
             C170 170, 185 140, 205 118
             C228 92, 260 85, 288 78
             C325 68, 352 48, 360 28"
          strokeWidth="6"
        />
        <path
          d="M205 118
             C185 110, 170 92, 158 70"
          strokeWidth="5"
        />
        <path
          d="M230 102
             C245 92, 255 76, 262 58"
          strokeWidth="5"
        />
        <path
          d="M250 96
             C270 110, 290 124, 316 128"
          strokeWidth="5"
        />
        <path
          d="M225 140
             C242 150, 258 166, 268 186"
          strokeWidth="5"
        />

        {/* Folhas */}
        <g fill="white" stroke="none" opacity="0.95">
          {[
            [150, 64, 10],
            [168, 80, 9],
            [186, 98, 9],
            [210, 76, 10],
            [238, 56, 10],
            [270, 66, 10],
            [290, 92, 10],
            [312, 130, 10],
            [268, 150, 10],
            [252, 172, 10],
            [230, 190, 10],
            [210, 154, 10],
          ].map(([x, y, r], i) => (
            <path
              key={i}
              d={`M ${x} ${y}
                 c ${r} -${r} ${r * 2} 0 ${r} ${r}
                 c -${r} ${r} -${r * 2} 0 -${r} -${r} Z`}
            />
          ))}
        </g>

        {/* Base do tronco */}
        <path d="M170 220 C190 210, 220 210, 240 220" strokeWidth="6" />
      </g>

      {/* Pássaros */}
      <g fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.95">
        <path d="M430 70 c 16 -10 26 -10 42 0" />
        <path d="M485 54 c 14 -10 22 -10 36 0" />
        <path d="M535 70 c 16 -10 26 -10 42 0" />
      </g>

      {/* Texto */}
      <g fill="white">
        {/* "sítio" pequeno */}
        <text
          x="390"
          y="150"
          fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"
          fontSize="44"
          letterSpacing="6"
          opacity="0.85"
        >
          sítio
        </text>

        {/* "Emanuel" grande (estilo script simplificado) */}
        <text
          x="410"
          y="200"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="118"
          fontStyle="italic"
          fontWeight="600"
        >
          Emanuel
        </text>

        {/* "DEUS CONOSCO" embaixo */}
        <text
          x="520"
          y="242"
          fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"
          fontSize="26"
          letterSpacing="8"
          opacity="0.8"
        >
          DEUS CONOSCO
        </text>
      </g>
    </svg>
  );
}
