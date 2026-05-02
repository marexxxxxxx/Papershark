import { useStore } from '@/stores/store'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { stats } = useStore()

  return (
    <div className="p-margin-page flex flex-col gap-lg min-h-full">
      {/* Page Header */}
      <div className="flex justify-between items-end mb-sm">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface mb-1">System Overview</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Real-time metrics for compute and agent activity.</p>
        </div>
        <Link to="/agents" className="bg-primary text-on-primary font-body-sm text-body-sm px-4 py-2 rounded-DEFAULT font-semibold hover:bg-primary-container transition-colors flex items-center gap-2 cursor-pointer">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Deploy Agent
        </Link>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* Metric 1: Token Usage */}
        <div className="col-span-12 md:col-span-4 bg-surface-container rounded-lg border border-outline-variant p-md flex flex-col relative overflow-hidden group">
          <div className="flex justify-between items-start mb-lg relative z-10">
            <span className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-wider">Token Usage</span>
            <span className="material-symbols-outlined text-tertiary-container text-[20px]">data_usage</span>
          </div>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="font-display-lg text-display-lg text-on-surface">
              {stats?.total_output_tokens ? (stats.total_output_tokens / 1000).toFixed(1) + 'k' : '0'}
            </span>
            <span className="font-body-sm text-body-sm text-primary flex items-center">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              Tokens
            </span>
          </div>
          {/* Abstract Background Graph */}
          <div className="absolute bottom-0 left-0 w-full h-1/2 opacity-20 pointer-events-none">
            <svg className="w-full h-full stroke-primary fill-none" preserveAspectRatio="none" strokeWidth="2" viewBox="0 0 100 50">
              <path d="M0 50 L10 40 L25 45 L40 20 L55 35 L70 15 L85 25 L100 5"></path>
            </svg>
          </div>
        </div>

        {/* Metric 2: Active Agents vs Total */}
        <div className="col-span-12 md:col-span-4 bg-surface-container rounded-lg border border-outline-variant p-md flex flex-col">
          <div className="flex justify-between items-start mb-lg">
            <span className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-wider">Running Agents</span>
            <span className="material-symbols-outlined text-primary-fixed text-[20px]">dns</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2">
              <span className="font-display-lg text-display-lg text-on-surface">{stats?.running_agents ?? 0}</span>
              <span className="font-body-base text-body-base text-on-surface-variant">/ {stats?.total_agents ?? 0} total</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${stats?.total_agents ? ((stats.running_agents / stats.total_agents) * 100) : 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Metric 3: Total Gateways */}
        <div className="col-span-12 md:col-span-4 bg-surface-container rounded-lg border border-outline-variant p-md flex flex-col">
          <div className="flex justify-between items-start mb-lg">
            <span className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-wider">Gateways Status</span>
            <span className="material-symbols-outlined text-secondary text-[20px]">smart_toy</span>
          </div>
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="font-display-lg text-display-lg text-on-surface">{stats?.active_gateways ?? 0}</span>
              <span className="font-label-caps text-label-caps text-primary tracking-widest mt-1">ACTIVE</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-headline-md text-headline-md text-on-surface-variant">{stats?.total_gateways ?? 0}</span>
              <span className="font-label-caps text-label-caps text-outline tracking-widest mt-1">TOTAL</span>
            </div>
          </div>
        </div>

        {/* Large Chart Area */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container rounded-lg border border-outline-variant p-md flex flex-col min-h-[360px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-body-base text-body-base text-on-surface font-semibold">Token Consumption Trend</h3>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-surface-variant text-on-surface rounded-DEFAULT font-label-caps text-label-caps border border-outline-variant">7D</button>
              <button className="px-3 py-1 bg-primary text-on-primary rounded-DEFAULT font-label-caps text-label-caps">30D</button>
            </div>
          </div>
          {/* Faux Line Chart */}
          <div className="flex-1 relative w-full h-full border-b border-l border-outline-variant/30 pb-6 pl-4">
            {/* Y-Axis Labels */}
            <div className="absolute left-[-24px] top-0 bottom-6 flex flex-col justify-between font-code-mono text-code-mono text-on-surface-variant text-[10px]">
              <span>1.5M</span>
              <span>1.0M</span>
              <span>0.5M</span>
              <span>0</span>
            </div>
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pt-2 pb-6 pl-4 pointer-events-none z-0">
              <div className="w-full h-px bg-outline-variant/20"></div>
              <div className="w-full h-px bg-outline-variant/20"></div>
              <div className="w-full h-px bg-outline-variant/20"></div>
              <div className="w-full h-px opacity-0"></div>
            </div>
            {/* Data Line */}
            <div className="absolute inset-0 pt-2 pb-6 pl-4 z-10">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 200">
                <defs>
                  <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#adc6ff" stopOpacity="0.2"></stop>
                    <stop offset="100%" stopColor="#adc6ff" stopOpacity="0"></stop>
                  </linearGradient>
                </defs>
                <path d="M0,150 L100,120 L200,140 L300,90 L400,110 L500,60 L600,80 L700,40 L800,50 L900,20 L1000,30 L1000,200 L0,200 Z" fill="url(#chartGradient)"></path>
                <path d="M0,150 L100,120 L200,140 L300,90 L400,110 L500,60 L600,80 L700,40 L800,50 L900,20 L1000,30" fill="none" stroke="#adc6ff" strokeWidth="2" vectorEffect="non-scaling-stroke"></path>
              </svg>
            </div>
            {/* X-Axis Labels */}
            <div className="absolute bottom-0 left-4 right-0 flex justify-between font-code-mono text-code-mono text-on-surface-variant text-[10px] mt-2">
              <span>Oct 1</span>
              <span>Oct 8</span>
              <span>Oct 15</span>
              <span>Oct 22</span>
              <span>Oct 30</span>
            </div>
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container rounded-lg border border-outline-variant flex flex-col overflow-hidden">
          <div className="p-md border-b border-outline-variant bg-surface-container-high flex justify-between items-center">
            <h3 className="font-body-base text-body-base text-on-surface font-semibold">Recent Activity</h3>
            <span className="material-symbols-outlined text-on-surface-variant text-[18px] cursor-pointer hover:text-on-surface">more_vert</span>
          </div>
          <div className="flex flex-col overflow-y-auto max-h-[360px]">
            {/* Activity Item 1 */}
            <div className="p-sm md:p-md border-b border-outline-variant/50 hover:bg-surface-variant/30 transition-colors flex gap-3 items-start">
              <div className="mt-1 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(173,198,255,0.6)] shrink-0"></div>
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="flex justify-between items-start">
                  <span className="font-body-sm text-body-sm text-on-surface font-medium truncate">Agent 'Data-Scraper-V2' Started</span>
                  <span className="font-code-mono text-code-mono text-on-surface-variant text-[11px] shrink-0 ml-2">2m ago</span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate">Allocated to VM-Cluster-Alpha.</span>
              </div>
            </div>
            {/* Activity Item 2 */}
            <div className="p-sm md:p-md border-b border-outline-variant/50 hover:bg-surface-variant/30 transition-colors flex gap-3 items-start">
              <div className="mt-1 h-2 w-2 rounded-full bg-error shadow-[0_0_8px_rgba(255,180,171,0.6)] shrink-0"></div>
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="flex justify-between items-start">
                  <span className="font-body-sm text-body-sm text-on-surface font-medium truncate">Provider API Rate Limit Exceeded</span>
                  <span className="font-code-mono text-code-mono text-on-surface-variant text-[11px] shrink-0 ml-2">15m ago</span>
                </div>
                <span className="font-body-sm text-body-sm text-error truncate">OpenAI GPT-4 endpoint returned 429.</span>
              </div>
            </div>
            {/* Activity Item 3 */}
            <div className="p-sm md:p-md border-b border-outline-variant/50 hover:bg-surface-variant/30 transition-colors flex gap-3 items-start">
              <div className="mt-1 h-2 w-2 rounded-full bg-outline-variant shrink-0"></div>
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="flex justify-between items-start">
                  <span className="font-body-sm text-body-sm text-on-surface font-medium truncate">Model Weights Updated</span>
                  <span className="font-code-mono text-code-mono text-on-surface-variant text-[11px] shrink-0 ml-2">1h ago</span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate">Llama-3-8b synchronized to edge nodes.</span>
              </div>
            </div>
            {/* Activity Item 4 */}
            <div className="p-sm md:p-md border-b border-outline-variant/50 hover:bg-surface-variant/30 transition-colors flex gap-3 items-start">
              <div className="mt-1 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(173,198,255,0.6)] shrink-0"></div>
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="flex justify-between items-start">
                  <span className="font-body-sm text-body-sm text-on-surface font-medium truncate">New Node Provisioned</span>
                  <span className="font-code-mono text-code-mono text-on-surface-variant text-[11px] shrink-0 ml-2">3h ago</span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate">us-west-2a pool expanded.</span>
              </div>
            </div>
          </div>
          <div className="mt-auto p-3 border-t border-outline-variant flex justify-center bg-surface-container-low cursor-pointer hover:bg-surface-variant transition-colors">
            <span className="font-label-caps text-label-caps text-primary">VIEW ALL LOGS</span>
          </div>
        </div>
      </div>
    </div>
  )
}
