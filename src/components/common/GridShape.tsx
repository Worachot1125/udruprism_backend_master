/* eslint-disable @next/next/no-img-element */
// src/components/common/GridShape.tsx
import React from "react";

function GridShape() {
  return (
    <>
      {/* Top-right decorative grid */}
      <div className="pointer-events-none absolute right-0 top-0 -z-10 w-full max-w-[250px] select-none xl:max-w-[450px]">
        <img
          src="/images/shape/grid-01.svg"
          alt=""
          aria-hidden="true"
          width={540}
          height={254}
          loading="lazy"
          decoding="async"
          draggable="false"
          className="block h-auto w-full"
          sizes="(min-width:1280px) 450px, 250px"
        />
      </div>

      {/* Bottom-left decorative grid (flipped) */}
      <div className="pointer-events-none absolute bottom-0 left-0 -z-10 w-full max-w-[250px] rotate-180 select-none xl:max-w-[450px]">
        <img
          src="/images/shape/grid-01.svg"
          alt=""
          aria-hidden="true"
          width={540}
          height={254}
          loading="lazy"
          decoding="async"
          draggable="false"
          className="block h-auto w-full"
          sizes="(min-width:1280px) 450px, 250px"
        />
      </div>
    </>
  );
}

export default React.memo(GridShape);
