import CardShowcase from "@/components/card-showcase/CardShowcase";

interface TapAwayCard3DProps {
  width?: string;
}

const TapAwayCard3D = ({ width = "min(240px, 70vw)" }: TapAwayCard3DProps) => (
  <CardShowcase width={width} />
);

export default TapAwayCard3D;
