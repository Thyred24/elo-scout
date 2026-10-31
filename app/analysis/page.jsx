import { Suspense } from "react";
import AnalysisClient from "./view";

export default function AnalysisPage(){return <Suspense fallback={<p>Maç analizi yükleniyor…</p>}><AnalysisClient/></Suspense>;}
