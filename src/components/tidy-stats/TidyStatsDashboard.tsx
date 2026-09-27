'use client';

import { useState, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpRight, BarChart3, Clock3, Dice5, Info, Layers3, ListTodo, RefreshCw, ShieldCheck, Timer, Vote, Volume2, Armchair, Utensils, StickyNote, AlertCircle, ChevronDown } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ACTIONS, PERIODS, TOOL_NAMES, type StatsData } from '@/lib/tidy-stats/model';
import { useTidyStats } from './useTidyStats';
import styles from './TidyStatsDashboard.module.css';

const n = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('ko-KR');
const time = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '관측 기록 없음';
const tabs = [['overview', '전체 요약'], ['tools', '도구별 사용'], ['versions', '버전별 현황'], ['quality', '수집 점검']] as const;
const versionColors = ['#638b80', '#829ab5', '#b7a080', '#a7a6c5', '#95af9a', '#b3b8c1'];
const versionValid = (v: string) => /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(v);

export default function TidyStatsDashboard() {
  const state = useTidyStats();
  const { data, query, days, version, automatic, visible, online } = state;
  const [tab, setTab] = useState<typeof tabs[number][0]>('overview');
  const [chartMetric, setChartMetric] = useState<'active' | 'minutes'>('active');
  const s = data?.summary;
  const observed = !!s?.events;
  const missingDays = data?.daily.filter(d => !d.events).length ?? 0;
  const change = s && s.previousActive > 0 ? Math.round((s.active - s.previousActive) / s.previousActive * 100) : null;
  const today = data?.daily.at(-1);
  const automaticRunning = automatic && visible && online && !query.error;
  const automaticLabel = !online ? '오프라인 · 갱신 대기' : !automatic ? '자동 갱신 일시정지' : query.error ? '연결 확인 필요 · 갱신 대기' : '5분마다 자동 갱신';
  const versions = [...new Set([...(data?.versions.map(v => v.key).filter(versionValid) ?? []), ...(version !== 'all' ? [version] : [])])];

  function exportCsv() {
    if (!data) return;
    const rows: (string | number)[][] = [['날짜(한국 시간)', '활성 설치 수', '처음 관측된 설치 수', '활동이 관측된 분', '기록 상태'],
      ...data.daily.map(d => [d.date, d.active ?? '', d.firstSeen ?? '', d.minutes ?? '', d.events ? '이벤트 관측' : '기록 없음·수집 여부 확인 필요'])];
    const csv = '\uFEFF' + rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `Tidy-Task-통계-${data.through}-${days}일.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  return <section className={styles.dashboard} aria-label="Tidy Task 통계" aria-busy={query.isFetching}>
    <header className={styles.heading}>
      <div><div className={styles.eyebrow}><BarChart3 size={14} /> TIDY TASK ANALYTICS</div>
        <h1>사용 현황</h1><p>필요한 숫자부터, 도구별 흐름까지.</p></div>
      <div className={styles.headingActions}>
        <button className={styles.button} onClick={exportCsv} disabled={!data || query.isFetching}><ArrowDownToLine size={14} />내보내기</button>
        <button className={styles.primaryButton} onClick={() => void state.refresh()} disabled={query.isFetching || !online}>
          <RefreshCw size={14} className={query.isFetching ? styles.spin : ''} />{query.isFetching ? '갱신 중' : '새로고침'}
        </button>
      </div>
    </header>

    <div className={styles.toolbar}>
      <div className={styles.filters}>
        <div className={styles.periods} role="group" aria-label="조회 기간">{PERIODS.map(period =>
          <button key={period} disabled={query.isFetching} aria-pressed={days === period} onClick={() => state.setDays(period)}>{period === 1 ? '오늘' : `${period}일`}</button>)}</div>
        <select aria-label="앱 버전" className={styles.select} value={version} disabled={query.isFetching} onChange={e => state.setVersion(e.target.value)}>
          <option value="all">모든 버전</option>{versions.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <button className={styles.auto} aria-pressed={automatic} onClick={state.toggleAutomatic} title="보고 있는 동안 5분마다 최신 집계. 클릭하면 자동 갱신을 켜거나 끕니다.">
        <span className={`${styles.dot} ${automaticRunning ? styles.online : ''}`} />{automaticLabel}
      </button>
    </div>
    <div className={styles.meta} aria-live="polite">
      <span>{data ? `${new Date(data.from).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })} ~ ${data.through.replaceAll('-', '.')} · 한국 시간` : `최근 ${days}일 · 한국 시간`}</span>
      <span>{data ? `집계 ${time(data.calculatedAt)}${data.cached ? ' · 저장된 집계' : ''}` : '운영 데이터를 확인하고 있습니다.'}</span>
    </div>
    {state.notice && <p role="status" className={styles.notice}>{state.notice}</p>}
    {query.error && <div role="alert" className={styles.alert}><AlertCircle size={17} className="shrink-0 mt-1" /><div><strong>{data ? '마지막 정상 집계를 표시하고 있습니다.' : '통계를 불러오지 못했습니다.'}</strong><br />{query.error.message}</div></div>}
    {!data && query.isFetching && <div role="status" className={`${styles.panel} ${styles.loading}`}><RefreshCw size={20} className={styles.spin} /><strong>사용 현황을 불러오고 있습니다.</strong><span>첫 집계는 조금 더 걸릴 수 있습니다.</span></div>}
    {data && <>
      <div className={styles.kpis}>
        <Kpi label="활성 설치" value={observed ? s!.active : null} unit="대" help="선택 기간에 실제 입력이 있었던 설치본 수입니다. 같은 설치본은 기간 내 한 번만 셉니다. 사람 수와 다릅니다." footer={change === null ? `오늘 ${n(today?.active)}대 관측` : `이전 동일 경과 기간보다 ${change > 0 ? '+' : ''}${change}%`} accent />
        <Kpi label="새로 관측된 설치" value={observed ? s!.firstSeen : null} unit="대" help="통계에서 처음 관측된 설치본입니다. 다운로드나 설치한 날짜를 의미하지 않습니다." footer="기간 내 첫 통계 기록" />
        <Kpi label="활동이 관측된 시간" value={observed ? s!.minutes : null} unit="분" help="클릭·입력이 있었던 분을 설치별로 합한 값입니다. 연속 사용 시간이나 앱을 켜 둔 시간과 다릅니다." footer={s!.active ? `활성 설치당 평균 ${n(Math.round(s!.minutes / s!.active))}분` : '입력이 있었던 분의 합계'} />
        <Kpi label="사용 세션" value={observed ? s!.sessions : null} unit="회" help="앱의 첫 실제 사용 또는 30분 동안 활동이 없다가 다시 사용한 시점에 새 세션을 셉니다." footer="새로운 사용 흐름이 시작된 횟수" />
      </div>
      {!observed && <div className={styles.alert}><Info size={17} className="shrink-0 mt-1" /><div><strong>선택한 조건에 관측 기록이 없습니다.</strong><br />기간이나 버전을 바꿔 보세요. 사용이 없었는지, 수집이 누락됐는지는 이 결과만으로 구분할 수 없습니다.</div></div>}
      <nav className={styles.tabs} aria-label="통계 분류">{tabs.map(([id, label]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}</button>)}</nav>

      {tab === 'overview' && <>
        <div className={styles.overview}>
          <Panel title="일별 사용 추이" subtitle={chartMetric === 'active' ? '하루에 실제 활동이 있었던 설치' : '클릭·입력이 있었던 분의 합계'} right={<div className={styles.smallTabs}>
            <button aria-pressed={chartMetric === 'active'} onClick={() => setChartMetric('active')}>활성 설치</button><button aria-pressed={chartMetric === 'minutes'} onClick={() => setChartMetric('minutes')}>활동 분</button></div>}>
            <div className={styles.chartSummary}><strong>{n(chartMetric === 'active' ? today?.active : today?.minutes)}</strong><span>{chartMetric === 'active' ? '대' : '분'} · 오늘, 집계 중</span></div>
            <div className={styles.chart} aria-label={chartMetric === 'active' ? '일별 활성 설치 수 추이' : '일별 활동 분 추이'}>
              <ResponsiveContainer width="100%" height="100%"><LineChart data={data.daily} margin={{ top: 20, right: 10, bottom: 0, left: -26 }}>
                <CartesianGrid stroke="var(--ts-line)" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="date" tickFormatter={v => String(v).slice(5).replace('-', '/')} tick={{ fontSize: 10, fill: 'var(--ts-sub)' }} tickLine={false} axisLine={false} minTickGap={28} dy={8} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--ts-sub)' }} tickLine={false} axisLine={false} />
                <Tooltip labelFormatter={v => `${v} · 한국 시간`} formatter={value => [n(Number(value)), chartMetric === 'active' ? '활성 설치' : '활동 분']} contentStyle={{ background: 'var(--ts-paper)', color: 'var(--ts-ink)', borderRadius: 9, border: '1px solid var(--ts-line)', fontSize: 12 }} />
                <Line type="linear" dataKey={chartMetric} stroke="#638b80" strokeWidth={2.5} dot={{ r: days === 90 ? 2 : 3, fill: 'var(--ts-paper)', strokeWidth: 2 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
              </LineChart></ResponsiveContainer>
            </div>
            <div className={styles.chartFooter}><span>기록 없는 날은 선을 연결하지 않습니다.</span>{missingDays > 0 && <button onClick={() => setTab('quality')}>미관측 {missingDays}일 확인 →</button>}</div>
          </Panel>
          <Panel title="도구 사용 순위" subtitle="활동이 관측된 분 기준 · 5.6.3 이상">
            <div className={styles.coverage}><Layers3 size={14} /><span>상세 집계 지원 <strong>{n(s!.supportedInstalls)} / {n(s!.active)}대</strong></span></div>
            <ToolRanking data={data} limit={5} coreOnly />
            <button className={styles.panelLink} onClick={() => setTab('tools')}>도구·기능 전체 보기<ArrowRight size={14} /></button>
          </Panel>
        </div>
        <div className={styles.bottom}>
          <Panel title="버전별 활동 비중" subtitle="활동 분 기준 · 선택 기간의 모든 버전" right={<button className={styles.textButton} onClick={() => setTab('versions')}>자세히 →</button>}>
            <VersionStrip data={data} />
          </Panel>
          <Panel title="수집 상태 한눈에" right={<button className={styles.textButton} onClick={() => setTab('quality')}>점검하기 →</button>}>
            <div className={styles.healthRows}>
              <div className={styles.healthItem}><ShieldCheck size={20} /><div><strong>{observed ? `앱 오류 영향 ${n(s!.errors)}대` : '오류 상태 미확인'}</strong><span>선택 기간 · 영향 설치 기준</span></div></div>
              <div className={styles.healthItem}><Clock3 size={20} /><div><strong>{time(s!.lastEvent)}</strong><span>선택 조건의 마지막 이벤트 발생</span></div></div>
            </div>
          </Panel>
        </div>
        <details className={styles.definitions}><summary><ChevronDown size={13} />일별 수치를 표로 보기</summary><DailyTable data={data} /></details>
      </>}

      {tab === 'tools' && <div className={styles.twoColumns}>
        <Panel title="도구별 활동" subtitle="설정·기타를 포함한 전체 도구 · 활동 분 순">
          <div className={styles.coverage}><Info size={14} /><span>5.6.3 이상 지원 설치 <strong>{n(s!.supportedInstalls)}대</strong>의 관측분입니다.</span></div>
          <ToolRanking data={data} />
        </Panel>
        <Panel title="실행한 기능" subtitle="단순 화면 열기가 아닌 실제 동작 기준">
          <div className={styles.actionGrid}>{ACTIONS.map(([event, label, unit, modern, items]) => {
            const row = data.actions.find(a => a.event === event);
            const value = row ? (items ? row.items : row.count) : (observed && (!modern || s!.supportedInstalls > 0 || data.tools.length) ? 0 : null);
            return <div className={styles.action} key={event}><span>{label}{modern ? ' · 5.6.3+' : ''}</span><strong>{n(value)}</strong><small>{value === null ? '미관측' : unit}</small></div>;
          })}</div>
          <details className={styles.definitions}><summary><Info size={13} />실행 횟수는 이렇게 셉니다.</summary><p>주사위는 굴린 횟수입니다. 타이머 시작·완료는 서로 다른 기간에 발생할 수 있어 완료율로 계산하지 않습니다. 업데이트 설치 시작은 성공을 뜻하지 않습니다. 새 기능의 0은 집계 지원 설치본에서 관측된 실행이 없다는 뜻입니다.</p></details>
        </Panel>
      </div>}

      {tab === 'versions' && <Panel title="버전별 사용 현황" subtitle="기간 중 업데이트한 설치본은 여러 버전에 포함될 수 있습니다. 모든 버전을 표시합니다.">
        <VersionStrip data={data} />
        <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>앱 버전</th><th>활성 설치</th><th>활동 분</th><th>상세 조회</th></tr></thead><tbody>{data.versions.map(v => <tr key={v.key}><td><strong>{v.key}</strong></td><td>{n(v.installs)}대</td><td>{n(v.minutes)}분</td><td>{versionValid(v.key) && <button className={styles.button} disabled={query.isFetching} onClick={() => { state.setVersion(v.key); setTab('overview'); }}>이 버전 보기 <ArrowUpRight size={12} /></button>}</td></tr>)}</tbody></table></div>
        {!data.versions.length && <Empty>활동이 관측된 버전이 없습니다.</Empty>}
      </Panel>}

      {tab === 'quality' && <div className={styles.twoColumns}>
        <Panel title="수집과 갱신" subtitle="연결 상태와 실제 이벤트 기록을 구분해서 확인합니다.">
          <dl><Status label="조회 연결" value="PostHog 응답 확인" /><Status label="집계 조건" value="운영 배포본 · 내부/테스트 계정 제외" /><Status label="마지막 이벤트 발생" value={time(s!.lastEvent)} /><Status label="집계 기준 시각" value={time(data.calculatedAt)} /><Status label="마지막 조회 시각" value={time(data.queriedAt)} /><Status label="세부 도구 지원 설치" value={`${n(s!.supportedInstalls)} / 활성 ${n(s!.active)}대`} /><Status label="기록 없는 날짜" value={`${missingDays} / ${days}일`} /></dl>
          <p className={styles.definitions}>이벤트가 없는 날짜를 이용자가 0명이었던 날로 단정하지 않습니다. 전송 지연·앱 미사용·수집 누락의 가능성이 있습니다. 연결 성공만으로 모든 설치본의 수집 상태를 확인할 수는 없습니다.</p>
        </Panel>
        <Panel title="앱 오류" subtitle="오류 원문 없이 코드와 영향 범위만 확인합니다.">
          {data.errors.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>오류 코드</th><th>영향 설치</th><th>발생 횟수</th></tr></thead><tbody>{data.errors.map(e => <tr key={e.code}><td className="break-all">{e.code}</td><td>{n(e.installs)}대</td><td>{n(e.count)}회</td></tr>)}</tbody></table></div> : <Empty>{observed ? '선택 기간에 수집된 앱 오류가 없습니다.' : '관측 데이터가 없어 오류 상태를 판단할 수 없습니다.'}</Empty>}
          <div className={styles.coverage}><Info size={14} /><span>미분류 도구 <strong>{n(data.tools.find(t => t.key === 'other')?.minutes ?? 0)}분</strong> · 도구별 상세 집계에서 확인</span></div>
        </Panel>
      </div>}
    </>}

    <footer className={styles.definitions}>
      <details><summary><Info size={13} />통계 해석과 수집 범위 안내</summary>
        <p>활성 설치는 사람 수와 다릅니다. 활동 분은 클릭·입력이 관측된 분의 합계이며 연속 사용 시간이 아닙니다. 여러 도구를 쓴 설치본은 각 도구에 포함됩니다. 일별 설치 수를 더한 값은 기간 전체의 고유 설치 수와 다릅니다.</p>
        <p>5.6.0~5.6.2 일부 배포본에는 수집 누락이 있었고, 도구별 상세 집계는 5.6.3부터 지원합니다. 미수집 과거 기록은 복원할 수 없습니다. PostHog의 최신 내부·테스트 계정 제외 설정을 적용합니다.</p>
        <p>화면을 보고 있을 때 5분마다 갱신하고, 다른 탭에서는 멈춥니다. 돌아오면 오래된 집계를 확인하며, 오류 시 재시도 간격을 늘립니다. 이 화면의 갱신은 PostHog 원본 대시보드 카드 저장 상태와 별개로 최신 데이터를 조회합니다.</p>
      </details>
      <a className="mt-3 inline-flex items-center gap-1 hover:underline" href="https://us.posthog.com/project/615314/dashboard/2109046" target="_blank" rel="noreferrer">PostHog 원본에서 확인 <ArrowUpRight size={12} /></a>
    </footer>
  </section>;
}

function Panel({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode }) {
  return <article className={styles.panel}><div className={styles.panelHead}><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{right}</div>{children}</article>;
}
function Kpi({ label, value, unit, help, footer, accent }: { label: string; value: number | null; unit: string; help: string; footer: string; accent?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return <article className={styles.kpi}><div className={styles.kpiLabel}>{label}<button className={styles.helpButton} aria-label={`${label} 집계 기준`} aria-expanded={expanded} onClick={() => setExpanded(v => !v)}><Info size={14} /></button></div><div className={styles.kpiValue}><strong className={accent ? styles.accent : ''}>{n(value)}</strong><span>{value === null ? '' : unit}</span></div><p className={styles.kpiFooter}>{footer}</p>{expanded && <p className={styles.kpiHelp}>{help}</p>}</article>;
}
function Empty({ children }: { children: ReactNode }) { return <div className={styles.empty}>{children}</div>; }
function Status({ label, value }: { label: string; value: string }) { return <div className={styles.stateRow}><dt>{label}</dt><dd>{value}</dd></div>; }
function ToolIcon({ id }: { id: string }) {
  const Icon = id.startsWith('timer') ? Timer : ({ dice: Dice5, vote: Vote, thermometer: Volume2, seating: Armchair, meal: Utensils, tiny_note: StickyNote, tidy_task: ListTodo, clock: Clock3 }[id] ?? Layers3);
  return <span className={styles.toolIcon}><Icon size={15} /></span>;
}
function ToolRanking({ data, limit, coreOnly = false }: { data: StatsData; limit?: number; coreOnly?: boolean }) {
  const rows = data.tools.filter(t => !coreOnly || !['other', 'settings', 'toolkit', 'meal_search', 'meal_settings'].includes(t.key)).sort((a, b) => b.minutes - a.minutes || b.installs - a.installs || a.key.localeCompare(b.key));
  const max = Math.max(1, ...rows.map(t => t.minutes));
  if (!rows.length) return <Empty>아직 도구 사용이 관측되지 않았습니다.<br />5.6.3 이상에서 사용한 기록이 표시됩니다.</Empty>;
  return <div>{rows.slice(0, limit).map((t, i) => <div className={styles.rank} key={t.key}><span className={styles.rankIndex}>{i + 1}</span><ToolIcon id={t.key} /><div><div className={styles.rankName} title={TOOL_NAMES[t.key] ?? t.key}>{TOOL_NAMES[t.key] ?? `미분류 (${t.key})`}</div><div className={styles.track}><div className={styles.fill} style={{ width: `${t.minutes / max * 100}%` }} /></div></div><div className={styles.rankValue}><strong>{n(t.minutes)}분</strong><span>{n(t.installs)}대 사용</span></div></div>)}</div>;
}
function VersionStrip({ data }: { data: StatsData }) {
  const total = data.versions.reduce((sum, v) => sum + v.minutes, 0);
  if (!total) return <Empty>버전별 활동 기록이 없습니다.</Empty>;
  return <><div className={styles.versionStrip} aria-label="버전별 활동 분 비중">{data.versions.map((v, i) => <span key={v.key} style={{ width: `${v.minutes / total * 100}%`, background: versionColors[i % versionColors.length] }} title={`${v.key}: ${Math.round(v.minutes / total * 100)}% · ${n(v.minutes)}분`} />)}</div><div className={styles.versionLegend}>{data.versions.map((v, i) => <span key={v.key}><i style={{ background: versionColors[i % versionColors.length] }} />{v.key} <strong>{Math.round(v.minutes / total * 100)}%</strong></span>)}</div></>;
}
function DailyTable({ data }: { data: StatsData }) {
  return <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>날짜</th><th>활성 설치</th><th>처음 관측</th><th>활동 분</th></tr></thead><tbody>{data.daily.map(d => <tr key={d.date}><td>{d.date}</td><td>{n(d.active)}</td><td>{n(d.firstSeen)}</td><td>{d.events ? n(d.minutes) : '기록 없음'}</td></tr>)}</tbody></table></div>;
}
