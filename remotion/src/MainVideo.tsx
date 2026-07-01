import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { slide } from "@remotion/transitions/slide";
import { Backdrop } from "./components/Backdrop";
import { SceneIntro } from "./scenes/SceneIntro";
import { ScenePipeline } from "./scenes/ScenePipeline";
import { SceneSquads } from "./scenes/SceneSquads";
import { SceneQualificacao } from "./scenes/SceneQualificacao";
import { SceneFluxo } from "./scenes/SceneFluxo";
import { SceneOutro } from "./scenes/SceneOutro";

// Scene durations (in frames @ 30fps)
const D_INTRO = 75;        // 2.5s
const D_PIPELINE = 165;    // 5.5s
const D_SQUADS = 150;      // 5s
const D_QUALIF = 150;      // 5s
const D_FLUXO = 150;       // 5s
const D_OUTRO = 105;       // 3.5s
const T = 22;              // transition length

// Total accounting for 5 transition overlaps
export const TOTAL_FRAMES =
  D_INTRO + D_PIPELINE + D_SQUADS + D_QUALIF + D_FLUXO + D_OUTRO - 5 * T;

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Backdrop />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={D_INTRO}>
          <SceneIntro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={D_PIPELINE}>
          <ScenePipeline />
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
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={D_FLUXO}>
          <SceneFluxo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={D_OUTRO}>
          <SceneOutro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
