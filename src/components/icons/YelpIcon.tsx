interface YelpIconProps {
  size?: number;
  className?: string;
}

export const YelpIcon = ({ size = 20, className }: YelpIconProps) => {
  return (
    <img
      src="https://www.yelp.com/favicon.ico"
      alt=""
      aria-hidden="true"
      className={className}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        objectFit: 'contain',
        display: 'block',
      }}
    />
  );
};
