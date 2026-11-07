import { Plane } from "../components/geometry/Plane";
import "../styles/pages.css";
import "../styles/math.css";

export function GeometryPage() {
  return (
    <div className="page wide">
      <h1>Geometria</h1>
      <p className="lead">Construa pontos, retas, segmentos, circunferências, triângulos e polígonos no plano cartesiano. Arraste os pontos e veja as medidas mudarem na hora.</p>
      <Plane />
    </div>
  );
}
