import { FC, useState, useEffect } from 'react';
import { Button } from '../components/Button';
import axiosInstance from '../api/axiosInstance';
import { 
  PlusCircle, 
  Calendar, 
  ListTodo, 
  CheckSquare, 
  Search 
} from 'lucide-react';

type TabType = 'project_create' | 'schedule' | 'kanban' | 'functional_qa' | 'quality_qa';

interface UserResponse {
  id: number;
  username: string;
  name: string;
  role: string;
}

interface QAItemResponse {
  id: number;
  ticket_id: number;
  category: 'FUNCTIONAL' | 'QUALITY';
  title: string;
  status: 'UNTESTED' | 'PASS' | 'FAIL';
  created_at: string;
  updated_at: string;
}

interface TicketResponse {
  id: number;
  title: string;
  description?: string;
  status: 'TO_DO' | 'TO_REVIEW' | 'IN_PROGRESS' | 'DONE';
  priority: 'P0' | 'P1' | 'P2';
  assignee_id?: number;
  assignee?: UserResponse;
  resolution?: string;
  start_date?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  qa_items: QAItemResponse[];
}

export const Dashboard: FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('project_create');
  const [projectName, setProjectName] = useState('');
  const [prdContent, setPrdContent] = useState('');
  const [specContent, setSpecContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  
  // 프로젝트 목록 및 선택된 프로젝트 ID 상태
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // API로부터 가져올 티켓 상태
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');

  // 프로젝트 목록 로드
  const fetchProjects = async () => {
    try {
      const response = await axiosInstance.get('/projects');
      setProjects(response.data);
      if (response.data.length > 0) {
        // 현재 선택된 프로젝트가 없거나 목록에 없다면 첫 번째 프로젝트를 선택
        const hasSelected = response.data.some((p: any) => p.id === selectedProjectId);
        if (!hasSelected) {
          setSelectedProjectId(response.data[0].id);
        }
      } else {
        setSelectedProjectId(null);
      }
    } catch (err: any) {
      console.error('Failed to load projects:', err);
    }
  };

  // 티켓 목록 로드 API 호출 함수
  const fetchTickets = async () => {
    if (selectedProjectId === null) {
      setTickets([]);
      return;
    }
    try {
      const response = await axiosInstance.get(`/tickets?project_id=${selectedProjectId}`);
      setTickets(response.data);
    } catch (err: any) {
      console.error('Failed to load tickets:', err);
    }
  };

  // 마운트 시 프로젝트 목록 로드
  useEffect(() => {
    fetchProjects();
  }, []);

  // 탭 전환 시 및 선택된 프로젝트 변경 시 티켓 정보 갱신
  useEffect(() => {
    fetchTickets();
  }, [activeTab, selectedProjectId]);

  // AI 일정 분석 및 일괄 생성 API 호출 연동 핸들러
  const handleGenerateSchedule = async () => {
    setApiError('');
    setApiSuccess('');

    if (!projectName.trim()) {
      setApiError('프로젝트 명을 기입해 주세요.');
      return;
    }

    if (!prdContent.trim() || !specContent.trim()) {
      setApiError('요구명세서(PRD)와 기능명세서(Spec) 내용을 모두 기입해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post('/schedules/generate', {
        project_name: projectName,
        prd_content: prdContent,
        spec_content: specContent
      });

      const { created_tickets_count, warning_tickets_count, tickets: newTickets } = response.data;
      setApiSuccess(`성공적으로 WBS 일정을 분해 및 생성했습니다! (태스크 티켓: ${created_tickets_count}개, 상충 경고: ${warning_tickets_count}개)`);
      
      // 기입 영역 비우기
      setProjectName('');
      setPrdContent('');
      setSpecContent('');

      // 프로젝트 목록 새로 로드하여 추가된 프로젝트 바인딩
      const projectListResponse = await axiosInstance.get('/projects');
      setProjects(projectListResponse.data);

      // 신규 프로젝트 ID 추출 및 지정
      if (newTickets.length > 0) {
        const newProjId = newTickets[0].project_id;
        setSelectedProjectId(newProjId);
      }
      
      setTickets(newTickets);
      
      // 생성 완료 후 2초 뒤에 일정관리(간트 차트) 탭으로 뷰 이동
      setTimeout(() => {
        setActiveTab('schedule');
        setApiSuccess('');
      }, 2000);

    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setApiError(err.response.data.detail);
      } else {
        setApiError('AI 일정 자동 생성 중 오류가 발생했습니다. 권한 및 기입 내용을 점검하세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ==================== [간트 차트용 날짜 연산 함수] ====================
  const getGanttDateRange = () => {
    // start_date와 due_date가 존재하는 티켓만 필터링
    const datedTickets = tickets.filter(t => t.start_date && t.due_date);
    if (datedTickets.length === 0) {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      return { 
        minTime: today.getTime(), 
        maxTime: nextWeek.getTime(), 
        days: 8, 
        datesArray: Array.from({length: 8}, (_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          return d;
        })
      };
    }

    let minDate = new Date(datedTickets[0].start_date!);
    let maxDate = new Date(datedTickets[0].due_date!);

    datedTickets.forEach(t => {
      const start = new Date(t.start_date!);
      const due = new Date(t.due_date!);
      if (start < minDate) minDate = start;
      if (due > maxDate) maxDate = due;
    });

    // 최소 마감 범위 7일로 방어
    const minTime = minDate.getTime();
    const maxTime = maxDate.getTime();
    const diffTime = maxTime - minTime;
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // 타임라인 헤더 구성을 위한 날짜 리스트 생성
    const datesArray: Date[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(minDate);
      d.setDate(minDate.getDate() + i);
      datesArray.push(d);
    }

    return { minTime, maxTime, days, datesArray };
  };

  const { minTime, maxTime, days, datesArray } = getGanttDateRange();

  // 간트 바의 left % 및 width % 계산
  const getGanttBarStyle = (startStr?: string, dueStr?: string) => {
    if (!startStr || !dueStr || days === 0) return { left: '0%', width: '0%' };
    
    const start = new Date(startStr).getTime();
    const due = new Date(dueStr).getTime();
    
    const totalDuration = maxTime - minTime;
    if (totalDuration === 0) return { left: '0%', width: '100%' };

    const leftPercent = ((start - minTime) / totalDuration) * 100;
    // 마감일까지의 범위 확보를 위해 하루치를 포함시킴
    const widthPercent = (((due - start) + (1000 * 60 * 60 * 24)) / totalDuration) * 100;
    
    return {
      left: `${Math.max(0, Math.min(100, leftPercent))}%`,
      width: `${Math.max(2, Math.min(100, widthPercent))}%`
    };
  };

  // 우선순위별 간트 바 색상 테마 클래스 지정
  const getPriorityBarColor = (priority: string) => {
    switch(priority) {
      case 'P0': return 'from-red-500 to-rose-600 shadow-red-500/20';
      case 'P2': return 'from-purple-500 to-indigo-600 shadow-purple-500/20';
      default: return 'from-blue-500 to-brand-600 shadow-brand-500/20';
    }
  };

  // ==================== [데이터 연계 필터링] ====================
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = searchQuery.trim() === '' || 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    
    return matchesSearch && matchesPriority;
  });

  // 기능검수 QA 항목 추출
  const functionalQaItems = filteredTickets.flatMap(t => 
    t.qa_items
      .filter(item => item.category === 'FUNCTIONAL')
      .map(item => ({ ...item, ticketTitle: t.title }))
  );

  // 품질검수 QA 항목 추출
  const qualityQaItems = filteredTickets.flatMap(t => 
    t.qa_items
      .filter(item => item.category === 'QUALITY')
      .map(item => ({ ...item, ticketTitle: t.title }))
  );

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
      {/* 5대 핵심 탭 메뉴 네비게이션 */}
      <div className="border-b border-slate-800 bg-[#070a13] px-6 py-3 flex flex-wrap gap-2">
        <button 
          onClick={() => setActiveTab('project_create')}
          className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition duration-200 flex items-center gap-1.5 ${
            activeTab === 'project_create' 
              ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25' 
              : 'text-slate-400 hover:bg-[#1e293b] hover:text-slate-200'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          프로젝트 생성
        </button>
        <button 
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition duration-200 flex items-center gap-1.5 ${
            activeTab === 'schedule' 
              ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25' 
              : 'text-slate-400 hover:bg-[#1e293b] hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          일정관리
        </button>
        <button 
          onClick={() => setActiveTab('kanban')}
          className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition duration-200 flex items-center gap-1.5 ${
            activeTab === 'kanban' 
              ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25' 
              : 'text-slate-400 hover:bg-[#1e293b] hover:text-slate-200'
          }`}
        >
          <ListTodo className="w-4 h-4" />
          칸반보드
        </button>
        <button 
          onClick={() => setActiveTab('functional_qa')}
          className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition duration-200 flex items-center gap-1.5 ${
            activeTab === 'functional_qa' 
              ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25' 
              : 'text-slate-400 hover:bg-[#1e293b] hover:text-slate-200'
          }`}
        >
          <Search className="w-4 h-4" />
          기능검수명세
        </button>
        <button 
          onClick={() => setActiveTab('quality_qa')}
          className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition duration-200 flex items-center gap-1.5 ${
            activeTab === 'quality_qa' 
              ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25' 
              : 'text-slate-400 hover:bg-[#1e293b] hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          품질검수명세
        </button>
      </div>

      {/* 활성 프로젝트 선택 글로벌 드롭다운 (프로젝트 생성 탭이 아닐 경우 상시 표출) */}
      {activeTab !== 'project_create' && (
        <div className="bg-[#121b2e] border-b border-slate-800 px-6 py-4 flex items-center gap-4">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">선택한 프로젝트:</label>
          {projects.length > 0 ? (
            <select
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(Number(e.target.value))}
              className="px-3 py-1.5 bg-[#1e293b] border border-slate-700 rounded-lg text-white text-xs font-semibold focus:outline-none focus:border-brand-500 cursor-pointer min-w-[200px]"
            >
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>{proj.name}</option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-amber-400 font-medium">
              ⚠️ 등록된 프로젝트가 없습니다. '프로젝트 생성' 탭에서 새 프로젝트를 등록해주세요.
            </span>
          )}
        </div>
      )}

      {/* 탭 개별 뷰 콘텐츠 영역 */}
      <div className="p-6 md:p-8">
        
        {/* ==================== [1. 프로젝트 생성 탭] ==================== */}
        {activeTab === 'project_create' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                🚀 AI Project PM 명세 분석 프로젝트 가동
              </h3>
              <p className="text-slate-400 text-sm">기획서(PRD) 및 기능 동작 명세서(Spec) 내용을 입력하면 AI가 일정을 분해하여 WBS 티켓과 검수 항목을 일괄 생성합니다.</p>
            </div>

            {apiError && (
              <div className="bg-red-900/30 border border-red-500/50 text-red-200 text-sm p-4 rounded-lg">
                ⚠️ {apiError}
              </div>
            )}
            {apiSuccess && (
              <div className="bg-green-900/30 border border-green-500/50 text-green-200 text-sm p-4 rounded-lg animate-pulse">
                ✓ {apiSuccess}
              </div>
            )}

            {/* 프로젝트 이름 기입란 */}
            <div className="bg-[#121b2e] p-4 rounded-lg border border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Project Name (프로젝트 이름)</label>
              <input
                type="text"
                placeholder="예: 반려동물 등록 시스템 개발 또는 신규 커머스 사이트"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#1e293b] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm font-semibold"
                disabled={loading}
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Product Requirement Document (요구명세서 PRD)</label>
                <textarea 
                  rows={10}
                  placeholder="# 요구명세서&#10;WBS로 나눌 개발 목표 요구 규격을 여기에 붙여넣거나 입력하세요."
                  value={prdContent}
                  onChange={(e) => setPrdContent(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1e293b] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm font-mono"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Functional Specification (기능명세서 Spec)</label>
                <textarea 
                  rows={10}
                  placeholder="# 기능명세서&#10;기능 단위 동작 스펙을 입력하세요. 기존 시스템과의 논리 상충 여부도 자동으로 분석해 드립니다."
                  value={specContent}
                  onChange={(e) => setSpecContent(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1e293b] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm font-mono"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={handleGenerateSchedule}
                disabled={loading}
                className="px-6 py-2.5 shadow-lg shadow-brand-500/20 flex items-center gap-2 text-sm font-semibold"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    AI 명세 분석 중...
                  </>
                ) : (
                  <>
                    🤖 AI 일정 분석 및 일괄 생성 실행
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ==================== [2. 일정관리 (Gantt Chart) 탭] ==================== */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                📊 프로젝트 타임라인 간트 차트 (Gantt Chart Timeline)
              </h3>
              <p className="text-slate-400 text-sm">각 개발 일정 티켓들의 시작일과 마감 마일스톤 범위를 시각적으로 가시화한 타임라인 그래프 뷰입니다.</p>
            </div>

            {tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-800 rounded-xl bg-[#070a13] text-center px-4">
                <Calendar className="w-12 h-12 text-slate-600 mb-4 animate-bounce" />
                <h4 className="text-white font-bold mb-1">생성된 WBS 일정이 없습니다.</h4>
                <p className="text-slate-500 text-sm mb-4 max-w-sm">프로젝트 생성 탭에서 기획 문서를 입력하고 AI 분석을 가동하여 간트 차트 타임라인을 확인하세요.</p>
                <Button variant="primary" onClick={() => setActiveTab('project_create')} className="text-xs">
                  WBS 일정 생성하러 가기
                </Button>
              </div>
            ) : (
              <div className="bg-[#070a13] border border-slate-800 rounded-xl overflow-x-auto p-6 shadow-lg">
                <div className="min-w-[800px] space-y-4">
                  {/* 타임라인 날짜 눈금 헤더 */}
                  <div className="flex text-slate-400 text-xs font-bold border-b border-slate-850 pb-2">
                    <div className="w-[280px] flex-shrink-0 text-slate-500 uppercase tracking-wider">개발 태스크 (티켓명)</div>
                    <div className="flex-1 relative flex justify-between px-2">
                      {datesArray.map((dateObj, idx) => (
                        <div key={idx} className="flex flex-col items-center flex-1 text-center border-l border-slate-850/50 min-w-[30px]">
                          <span className="text-[9px] text-slate-500">{dateObj.toLocaleDateString('ko-KR', {month: 'numeric', day: 'numeric'})}</span>
                          <span className="text-[8px] text-slate-600">
                            {['일','월','화','수','목','금','토'][dateObj.getDay()]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 간트 가로 막대바 데이터 리스트 */}
                  <div className="divide-y divide-slate-850 space-y-3 pt-3">
                    {tickets.map((ticket) => {
                      const hasDates = ticket.start_date && ticket.due_date;
                      const barStyle = getGanttBarStyle(ticket.start_date, ticket.due_date);
                      const priorityColor = getPriorityBarColor(ticket.priority);
                      
                      return (
                        <div key={ticket.id} className="flex items-center py-2 hover:bg-[#0f172a]/20 rounded transition">
                          {/* 왼쪽 태스크 라벨 정보 */}
                          <div className="w-[280px] flex-shrink-0 pr-4">
                            <div className="flex items-center gap-2">
                              {ticket.title.startsWith('[AI-Detected]') ? (
                                <span className="bg-amber-950/40 border border-amber-600/30 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  🤖 경고
                                </span>
                              ) : (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-white ${
                                  ticket.priority === 'P0' ? 'bg-red-600' : ticket.priority === 'P2' ? 'bg-purple-600' : 'bg-brand-600'
                                }`}>
                                  {ticket.priority}
                                </span>
                              )}
                              <h4 className="font-medium text-slate-200 text-sm truncate" title={ticket.title}>{ticket.title}</h4>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 flex gap-2">
                              <span>시작: {ticket.start_date || '미지정'}</span>
                              <span>마감: {ticket.due_date || '미지정'}</span>
                            </div>
                          </div>

                          {/* 오른쪽 가로 간트 바 렌더링 */}
                          <div className="flex-1 relative h-6 bg-slate-900/30 rounded-lg">
                            {/* 타임라인 격자 배경선 */}
                            <div className="absolute inset-0 flex justify-between pointer-events-none">
                              {datesArray.map((_, idx) => (
                                <div key={idx} className="h-full border-r border-slate-850/15 flex-1" />
                              ))}
                            </div>

                            {/* 간트 바 본체 */}
                            {hasDates && (
                              <div 
                                style={barStyle}
                                className={`absolute h-4 top-1 rounded-full bg-gradient-to-r ${priorityColor} shadow-md flex items-center px-2 text-[9px] text-white font-bold select-none cursor-pointer hover:scale-[1.01] transition transform`}
                                title={`${ticket.title} (${ticket.start_date} ~ ${ticket.due_date})`}
                              >
                                <span className="truncate">{ticket.title}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== [3. 칸반보드 탭] ==================== */}
        {activeTab === 'kanban' && (
          <div className="space-y-6">
            {/* 검색바 및 다중 필터링 바 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#121b2e] border border-slate-800 p-4 rounded-xl">
              <div className="flex flex-1 flex-wrap gap-3">
                <input 
                  type="text" 
                  placeholder="태스크 제목 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 bg-[#1e293b] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none text-sm w-full md:max-w-xs"
                />
                <select 
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 bg-[#1e293b] border border-slate-700 rounded-lg text-white focus:outline-none text-sm cursor-pointer"
                >
                  <option value="ALL">우선순위 (전체)</option>
                  <option value="P0">P0 (긴급/차단막)</option>
                  <option value="P1">P1 (보통/핵심)</option>
                  <option value="P2">P2 (낮음)</option>
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 cursor-pointer select-none">
                  <input type="checkbox" className="rounded bg-[#1e293b] border-slate-700 text-brand-500 focus:ring-brand-500 w-4 h-4" />
                  내 담당 작업만 보기
                </label>
              </div>
            </div>

            {/* 4열 칸반보드 렌더링 (동적 티켓 바인딩) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* TO_DO */}
              <div className="bg-[#070a13] border border-slate-800 rounded-xl p-4 min-h-[40vh]">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                  <span className="font-semibold text-slate-300 text-sm">To Do (대기)</span>
                  <span className="bg-[#1e293b] text-slate-400 text-xs px-2 py-0.5 rounded-full font-bold">
                    {filteredTickets.filter(t => t.status === 'TO_DO').length}
                  </span>
                </div>
                <div className="space-y-3">
                  {filteredTickets.filter(t => t.status === 'TO_DO').map(ticket => (
                    <div key={ticket.id} className="bg-[#1e293b] border border-slate-700 p-4 rounded-lg shadow cursor-pointer hover:border-slate-500 transition duration-150">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded text-white ${
                          ticket.priority === 'P0' ? 'bg-red-600' : ticket.priority === 'P2' ? 'bg-purple-600' : 'bg-brand-600'
                        }`}>{ticket.priority}</span>
                      </div>
                      <h4 className="font-semibold text-white text-sm">{ticket.title}</h4>
                      {ticket.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ticket.description}</p>}
                    </div>
                  ))}
                  {filteredTickets.filter(t => t.status === 'TO_DO').length === 0 && (
                    <div className="text-center py-10 text-xs text-slate-600">대기 중인 티켓이 없습니다.</div>
                  )}
                </div>
              </div>

              {/* TO_REVIEW */}
              <div className="bg-[#070a13] border border-slate-800 rounded-xl p-4 min-h-[40vh]">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                  <span className="font-semibold text-slate-300 text-sm">To Review (검토 필요)</span>
                  <span className="bg-[#1e293b] text-slate-400 text-xs px-2 py-0.5 rounded-full font-bold">
                    {filteredTickets.filter(t => t.status === 'TO_REVIEW').length}
                  </span>
                </div>
                <div className="space-y-3">
                  {filteredTickets.filter(t => t.status === 'TO_REVIEW').map(ticket => {
                    const isAiDetected = ticket.title.startsWith('[AI-Detected]');
                    return (
                      <div 
                        key={ticket.id} 
                        className={`bg-[#1e293b] p-4 rounded-lg shadow cursor-pointer transition duration-150 relative overflow-hidden ${
                          isAiDetected ? 'border-2 border-amber-500/50 hover:border-amber-400' : 'border border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {isAiDetected && (
                          <div className="absolute top-0 right-0 w-7 h-7 flex items-center justify-center bg-amber-500 text-slate-900 text-[10px] font-bold rounded-bl-lg">🤖</div>
                        )}
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded text-white ${
                            ticket.priority === 'P0' ? 'bg-red-600' : ticket.priority === 'P2' ? 'bg-purple-600' : 'bg-brand-600'
                          }`}>{ticket.priority}</span>
                        </div>
                        <h4 className="font-semibold text-white text-sm pr-4">{ticket.title}</h4>
                        {ticket.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ticket.description}</p>}
                      </div>
                    );
                  })}
                  {filteredTickets.filter(t => t.status === 'TO_REVIEW').length === 0 && (
                    <div className="text-center py-10 text-xs text-slate-600">검토 요청 티켓이 없습니다.</div>
                  )}
                </div>
              </div>

              {/* IN_PROGRESS */}
              <div className="bg-[#070a13] border border-slate-800 rounded-xl p-4 min-h-[40vh]">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                  <span className="font-semibold text-slate-300 text-sm">In Progress (진행 중)</span>
                  <span className="bg-[#1e293b] text-slate-400 text-xs px-2 py-0.5 rounded-full font-bold">
                    {filteredTickets.filter(t => t.status === 'IN_PROGRESS').length}
                  </span>
                </div>
                <div className="space-y-3">
                  {filteredTickets.filter(t => t.status === 'IN_PROGRESS').map(ticket => (
                    <div key={ticket.id} className="bg-[#1e293b] border border-slate-700 p-4 rounded-lg shadow cursor-pointer hover:border-slate-500 transition duration-150">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded text-white ${
                          ticket.priority === 'P0' ? 'bg-red-600' : ticket.priority === 'P2' ? 'bg-purple-600' : 'bg-brand-600'
                        }`}>{ticket.priority}</span>
                      </div>
                      <h4 className="font-semibold text-white text-sm">{ticket.title}</h4>
                      {ticket.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ticket.description}</p>}
                    </div>
                  ))}
                  {filteredTickets.filter(t => t.status === 'IN_PROGRESS').length === 0 && (
                    <div className="text-center py-10 text-xs text-slate-600">진행 중인 티켓이 없습니다.</div>
                  )}
                </div>
              </div>

              {/* DONE */}
              <div className="bg-[#070a13] border border-slate-800 rounded-xl p-4 min-h-[40vh]">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                  <span className="font-semibold text-slate-300 text-sm">Done (완료)</span>
                  <span className="bg-[#1e293b] text-slate-400 text-xs px-2 py-0.5 rounded-full font-bold">
                    {filteredTickets.filter(t => t.status === 'DONE').length}
                  </span>
                </div>
                <div className="space-y-3">
                  {filteredTickets.filter(t => t.status === 'DONE').map(ticket => (
                    <div key={ticket.id} className="bg-[#1e293b] border border-slate-700 p-4 rounded-lg shadow cursor-pointer hover:border-slate-500 transition duration-150">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded text-white ${
                          ticket.priority === 'P0' ? 'bg-red-600' : ticket.priority === 'P2' ? 'bg-purple-600' : 'bg-brand-600'
                        }`}>{ticket.priority}</span>
                      </div>
                      <h4 className="font-semibold text-white text-sm">{ticket.title}</h4>
                      {ticket.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ticket.description}</p>}
                    </div>
                  ))}
                  {filteredTickets.filter(t => t.status === 'DONE').length === 0 && (
                    <div className="text-center py-10 text-xs text-slate-600">완료된 티켓이 없습니다.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== [4. 기능검수명세 탭] ==================== */}
        {activeTab === 'functional_qa' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                🔍 기능 검수 명세 체크리스트 (Functional QA checklist)
              </h3>
              <p className="text-slate-400 text-sm">각 개발 티켓들과 1:N으로 바인딩되어 생성된 세부 기능 명세 검수 요건입니다.</p>
            </div>
            <div className="bg-[#070a13] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#121b2e] border-b border-slate-800 text-slate-300">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">검수 ID</th>
                    <th className="px-6 py-3.5 font-semibold">연계 칸반 티켓</th>
                    <th className="px-6 py-3.5 font-semibold">검수 검증 동작 조건</th>
                    <th className="px-6 py-3.5 font-semibold text-center">검수 상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-350">
                  {functionalQaItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-[#0f172a]/40 transition">
                      <td className="px-6 py-4 font-bold text-slate-500">QA-F{idx + 1}</td>
                      <td className="px-6 py-4 text-xs text-slate-400 truncate max-w-[200px]" title={item.ticketTitle}>
                        {item.ticketTitle}
                      </td>
                      <td className="px-6 py-4 font-medium">{item.title}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold select-none ${
                          item.status === 'PASS' 
                            ? 'bg-green-950/40 border border-green-600/40 text-green-300' 
                            : item.status === 'FAIL' 
                              ? 'bg-red-950/40 border border-red-600/40 text-red-300' 
                              : 'bg-slate-800/40 border border-slate-600/40 text-slate-400'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {functionalQaItems.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-600 text-xs font-medium">
                        표시할 기능 검수 명세가 없습니다. 프로젝트를 먼저 생성해 주세요.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== [5. 품질검수명세 탭] ==================== */}
        {activeTab === 'quality_qa' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                🛡️ 품질 검수 명세 체크리스트 (Quality QA Checklist)
              </h3>
              <p className="text-slate-400 text-sm">성능, 보안 및 코딩 스펙 제약 조건에 대한 품질 검증 가이드 리스트입니다.</p>
            </div>
            <div className="bg-[#070a13] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#121b2e] border-b border-slate-800 text-slate-300">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">검수 ID</th>
                    <th className="px-6 py-3.5 font-semibold">연계 칸반 티켓</th>
                    <th className="px-6 py-3.5 font-semibold">품질 검증 세부 요건</th>
                    <th className="px-6 py-3.5 font-semibold text-center">검수 상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-350">
                  {qualityQaItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-[#0f172a]/40 transition">
                      <td className="px-6 py-4 font-bold text-slate-500">QA-Q{idx + 1}</td>
                      <td className="px-6 py-4 text-xs text-slate-400 truncate max-w-[200px]" title={item.ticketTitle}>
                        {item.ticketTitle}
                      </td>
                      <td className="px-6 py-4 font-medium">{item.title}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold select-none ${
                          item.status === 'PASS' 
                            ? 'bg-green-950/40 border border-green-600/40 text-green-300' 
                            : item.status === 'FAIL' 
                              ? 'bg-red-950/40 border border-red-600/40 text-red-300' 
                              : 'bg-slate-800/40 border border-slate-600/40 text-slate-400'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {qualityQaItems.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-600 text-xs font-medium">
                        표시할 품질 검수 명세가 없습니다. 프로젝트를 먼저 생성해 주세요.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
