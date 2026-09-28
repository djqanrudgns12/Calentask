import type { CSSProperties } from 'react';
import styles from './TidyStatsDashboard.module.css';
import motion from './TidyStatsMotion.module.css';

const Bone = ({ w, h, r, style }: { w: CSSProperties['width']; h: number; r?: number; style?: CSSProperties }) =>
  <span className={motion.bone} style={{ width: w, height: h, borderRadius: r, ...style }} />;

/** 첫 조회 동안의 뼈대. 실제 카드·패널 클래스를 그대로 써서 데이터가 들어와도 배치가 흔들리지 않는다. */
export function StatsSkeleton() {
  return <div aria-hidden>
    <div className={styles.kpis}>{[0, 1, 2, 3].map(i =>
      <article key={i} className={styles.kpi}>
        <div className={styles.kpiLabel}><Bone w={30} h={30} r={9} /><Bone w="46%" h={15} /></div>
        <div className={styles.kpiValue}><Bone w="58%" h={40} r={10} /></div>
        <div className={styles.kpiFooter}><Bone w="72%" h={14} /></div>
      </article>)}
    </div>
    <Bone w={340} h={22} style={{ maxWidth: '80%', marginBottom: 30 }} />
    <div className={styles.overview}>
      <article className={styles.panel}>
        <div className={styles.panelHead}><div className={motion.boneStack} style={{ gap: 8, flex: 1 }}><Bone w="34%" h={20} /><Bone w="52%" h={14} /></div><Bone w={150} h={34} r={10} /></div>
        <Bone w="100%" h={260} r={12} />
      </article>
      <article className={styles.panel}>
        <div className={styles.panelHead}><div className={motion.boneStack} style={{ gap: 8, flex: 1 }}><Bone w="44%" h={20} /><Bone w="64%" h={14} /></div></div>
        <div className={motion.boneStack}>{[92, 74, 60, 48, 36].map(w =>
          <div key={w} style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Bone w={34} h={34} r={10} /><div className={motion.boneStack} style={{ gap: 8, flex: 1 }}><Bone w="55%" h={14} /><Bone w={`${w}%`} h={6} /></div></div>)}
        </div>
      </article>
    </div>
  </div>;
}
