import { Navigate } from "react-router-dom";

// Reconciliação foi unificada em /financeiro?tab=distribuicao
export default function Reconciliacao() {
  return <Navigate to="/financeiro?tab=distribuicao" replace />;
}
