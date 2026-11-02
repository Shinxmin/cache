import { useRef, useState } from "react";

const EMPTY = { total: 0, done: 0, failed: 0, current: 0, active: false };

// 다운로드·업로드 대기열. 종류(down / up)마다 하나씩 따로 있어서, 다운로드 도중에 업로드가 돌아도
// 서로 막지 않는다. 같은 종류끼리는 들어온 순서대로 하나씩 처리한다 — A를 받는 중에 B를 더 받으면
// B는 대기열에 들어가 A가 끝나는 대로 이어서 받는다.
//
// 상태(종류별): total(이번 묶음의 전체 작업 수) · done(끝난 수, 실패 포함) · failed(실패 수) ·
// current(지금 하는 작업의 진행도 0~1) · active(처리 중). 대기열이 비면 실패가 없을 때는 잠깐 뒤
// 상태를 비워 헤더 버튼이 사라지게 하고, 실패가 하나라도 있으면 사용자가 ack(종류)를 부를 때까지
// (헤더 버튼을 누를 때까지) 그대로 둔다.
//
// 작업은 { run(onProgress) } 형태이고 run이 던지면 실패로 센다.
const HIDE_DELAY_MS = 700;

export default function useTransferQueue() {
  const [state, setState] = useState({ down: EMPTY, up: EMPTY });
  const stats = useRef({ down: { ...EMPTY }, up: { ...EMPTY } });
  const queues = useRef({ down: [], up: [] });
  const timers = useRef({ down: 0, up: 0 });

  const commit = (kind) => setState((s) => ({ ...s, [kind]: { ...stats.current[kind] } }));
  const reset = (kind) => {
    stats.current[kind] = { ...EMPTY };
    commit(kind);
  };

  const drain = async (kind) => {
    const st = stats.current[kind];
    if (st.active) return;
    st.active = true;
    clearTimeout(timers.current[kind]);
    while (queues.current[kind].length) {
      const job = queues.current[kind].shift();
      st.current = 0;
      commit(kind);
      let ok = true;
      try {
        await job.run((p) => {
          st.current = Math.max(0, Math.min(1, p || 0));
          commit(kind);
        });
      } catch {
        ok = false;
      }
      st.done += 1;
      if (!ok) st.failed += 1;
      st.current = 0;
      commit(kind);
    }
    st.active = false;
    commit(kind);
    if (st.failed === 0) {
      timers.current[kind] = setTimeout(() => {
        const now = stats.current[kind];
        if (!now.active && now.failed === 0) reset(kind);
      }, HIDE_DELAY_MS);
    }
  };

  const enqueue = (kind, jobs) => {
    if (!jobs.length) return;
    const st = stats.current[kind];
    clearTimeout(timers.current[kind]);
    // 지난 묶음이 깨끗이 끝난 채 사라지길 기다리던 중이면 새 묶음으로 시작한다(실패가 남아 있으면 이어서 센다).
    if (!st.active && st.failed === 0 && st.done === st.total) {
      stats.current[kind] = { ...EMPTY };
    }
    stats.current[kind].total += jobs.length;
    queues.current[kind].push(...jobs);
    commit(kind);
    drain(kind);
  };

  // 실패가 남아 있던 헤더 버튼을 눌러 치운다. 처리 중에는 치우지 않는다.
  const ack = (kind) => {
    if (stats.current[kind].active) return;
    reset(kind);
  };

  return { transfers: state, enqueue, ack };
}
