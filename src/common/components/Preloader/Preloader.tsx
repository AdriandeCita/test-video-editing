import "./Preloader.css";

const Preloader = ({ caption }: { caption: string }) => (
  <div className="preloader__container">
    <svg
      width="200"
      height="20"
      viewBox="0 0 200 20"
      xmlns="http://www.w3.org/2000/svg"
      fill="#999"
    >
      <rect fill="#bbb" x="0" y="0" width="200" height="20" rx="10" />
      <mask id="mask" x="0" y="0" width="100" height="20">
        <rect x="0" y="0" width="200" height="20" rx="10" fill="white" />
      </mask>
      <rect
        fill="#777"
        x="-100"
        y="0"
        width="100"
        height="20"
        rx="10"
        mask="url(#mask)"
      >
        <animate
          attributeName="x"
          values="-100;200"
          dur="2s"
          repeatCount="indefinite"
        />
      </rect>
    </svg>
    {caption ? (
      <p>
        <strong>{caption}</strong>
      </p>
    ) : (
      ""
    )}
  </div>
);

export default Preloader;
