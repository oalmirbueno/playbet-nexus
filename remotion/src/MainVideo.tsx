import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { Backdrop } from "./components/Backdrop";
import { SceneIntro } from "./scenes/SceneIntro";
import { ScenePipeline } from "./scenes/ScenePipeline";
import { SceneChecklistDemo } from "./scenes/SceneChecklistDemo";
import { SceneCadastroDemo } from "./scenes/SceneCadastroDemo";
import { SceneSquads } from "./scenes/SceneSquads";
import { SceneQualificacao } from "./scenes/SceneQualificacao";
import { SceneFluxo } from "./scenes/SceneFluxo";
import { SceneOutro } from "./scenes/SceneOutro";

// Frame durations @ 30fps
const D_INTRO = 75;         // 2.5s
const D_PIPELINE = 120;     // 4s
const D_CHECK = 240;        // 8s  ← drag + sheet
const D_CADASTRO = 240;     // 8s  ← drag + form
const D_SQUADS = 135;       // 4.5s
const D_QUALIF = 135;       // 4.5s
const D_FLUXO = 135;        // 4.5s
const D_OUTRO = 110;        // ~3.7s
const T = 22;

// 7 transitions overlap
export const TOTAL_FRAMES =
  D_INTRO + D_PIPELINE + D_CHECK + D_CADASTRO + D_SQUADS + D_QUALIF + D_FLUXO + D_OUTRO - 7 * T;

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Backdrop />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={D_INTRO}>
          <SceneIntro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={D_PIPELINE}>
          <ScenePipeline />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={D_CHECK}>
          <SceneChecklistDemo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={D_CADASTRO}>
          <SceneCadastroDemo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={D_SQUADS}>
          <SceneSquads />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={D_QUALIF}>
          <SceneQualificacao />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={D_FLUXO}>
          <SceneFluxo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={D_OUTRO}>
          <SceneOutro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
