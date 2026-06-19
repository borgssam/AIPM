import { FC, useState, useEffect } from 'react';
import { Button } from '../components/Button';
import axiosInstance from '../api/axiosInstance';
import { 
  PlusCircle, 
  Calendar, 
  ListTodo, 
  CheckSquare, 
  Search,
  RefreshCw
} from 'lucide-react';

type TabType = 'project_create' | 'schedule' | 'kanban' | 'functional_qa' | 'quality_qa';

interface EpicResponse {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  start_date?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

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
  status: 'UNTESTED' | 'PASS' | 'FAIL' | 'APPROVED';
  created_at: string;
  updated_at: string;
}

interface TicketResponse {
  id: number;
  title: string;
  description?: string;
  status: 'TO_DO' | 'TO_REVIEW' | 'IN_PROGRESS' | 'DONE';
  priority: 'P0' | 'P1' | 'P2';
  project_id?: number;
  epic_ids: number[];
  epics: EpicResponse[];
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
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;

  const [activeTab, setActiveTab] = useState<TabType>(
    currentUser && currentUser.role === 'PM' ? 'project_create' : 'schedule'
  );
  const [projectName, setProjectName] = useState('');
  const [prdContent, setPrdContent] = useState('');
  const [specContent, setSpecContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  
  // Epics state
  const [epics, setEpics] = useState<EpicResponse[]>([]);

  // 프로젝트 목록 및 선택된 프로젝트 ID 상태
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // API로부터 가져올 티켓 상태
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');

  // 일정 수정 관련 상태
  const [editingTicket, setEditingTicket] = useState<TicketResponse | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  // 에픽 일정 수정 관련 상태
  const [editingEpic, setEditingEpic] = useState<EpicResponse | null>(null);
  const [editEpicStartDate, setEditEpicStartDate] = useState('');
  const [editEpicDueDate, setEditEpicDueDate] = useState('');

  // 에픽 일정 생성 관련 상태
  const [isEpicCreateModalOpen, setIsEpicCreateModalOpen] = useState(false);
  const [epicCreateTitle, setEpicCreateTitle] = useState('');
  const [epicCreateDescription, setEpicCreateDescription] = useState('');
  const [epicCreateStartDate, setEpicCreateStartDate] = useState('');
  const [epicCreateDueDate, setEpicCreateDueDate] = useState('');

  // 칸반 내 담당 작업 필터링 상태
  const [myTasksOnly, setMyTasksOnly] = useState(false);

  // QA 상태 필터링 상태
  const [qaFilter, setQaFilter] = useState<'ALL' | 'UNTESTED' | 'TESTED' | 'APPROVED'>('ALL');

  // 칸반 새 할 일 생성 및 내용 수정 모달 관련 상태
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // 인공지능 플링크 모달 관련 상태
  const [isAiFlinkModalOpen, setIsAiFlinkModalOpen] = useState(false);
  const [selectedEpicIdForFlink, setSelectedEpicIdForFlink] = useState<number | ''>('');
  const [excludeExistingTasks, setExcludeExistingTasks] = useState(false);
  const [flinkRecommendations, setFlinkRecommendations] = useState<Array<{
    id: number;
    title: string;
    description: string;
    priority: 'P0' | 'P1' | 'P2';
    selected: boolean;
  }>>([]);

  const handleGetFlinkRecommendations = () => {
    // UI 뼈대 시연용 Mock 데이터 설정
    setFlinkRecommendations([
      { id: 1, title: '로그인 페이지 컴포넌트 마크업', description: '기본 테마가 적용된 로그인 폼 UI 구현', priority: 'P1', selected: true },
      { id: 2, title: '사용자 JWT 토큰 만료 핸들러 작성', description: 'API 호출 에러 발생 시 토큰 만료 판별 및 세션 클리어', priority: 'P0', selected: false },
      { id: 3, title: '회원가입 비밀번호 정규식 유효성 검증', description: '8자 이상 영문 대소문자 특수문자 조합 정규식 적용', priority: 'P2', selected: true }
    ]);
  };

  const handleToggleRecommendSelect = (id: number) => {
    setFlinkRecommendations(prev =>
      prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item)
    );
  };
  const [ticketFormData, setTicketFormData] = useState({
    id: undefined as number | undefined,
    title: '',
    description: '',
    status: 'TO_DO',
    priority: 'P1',
    assignee_id: null as number | null,
    epic_ids: [] as number[],
    need_functional_qa: false,
    functional_qa_title: '기능 검수',
    need_quality_qa: false,
    quality_qa_title: '품질 검수'
  });

  // 전체 팀원 목록 상태
  const [teamMembers, setTeamMembers] = useState<UserResponse[]>([]);

  const fetchTeamMembers = async () => {
    try {
      const response = await axiosInstance.get('/users');
      setTeamMembers(response.data);
    } catch (err: any) {
      console.error('Failed to load team members:', err);
    }
  };

  const handleUpdateAssignee = async (ticketId: number, assigneeId: number | null) => {
    try {
      setLoading(true);
      await axiosInstance.put(`/tickets/${ticketId}`, {
        assignee_id: assigneeId
      });
      fetchTickets();
      setApiSuccess('담당자가 성공적으로 업데이트되었습니다.');
      setTimeout(() => setApiSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setApiError('담당자 업데이트에 실패했습니다.');
      setTimeout(() => setApiError(''), 3500);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (ticketId: number, newStatus: string) => {
    try {
      setLoading(true);
      await axiosInstance.put(`/tickets/${ticketId}`, {
        status: newStatus
      });
      fetchTickets();
      setApiSuccess('태스크 상태가 업데이트되었습니다.');
      setTimeout(() => setApiSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setApiError('상태 업데이트에 실패했습니다.');
      setTimeout(() => setApiError(''), 3500);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (ticket: TicketResponse) => {
    setEditingTicket(ticket);
    setEditStartDate(ticket.start_date || '');
    setEditDueDate(ticket.due_date || '');
  };

  const handleSaveDates = async () => {
    if (!editingTicket) return;
    try {
      setLoading(true);
      await axiosInstance.put(`/tickets/${editingTicket.id}`, {
        start_date: editStartDate || null,
        due_date: editDueDate || null
      });
      setApiSuccess('일정이 성공적으로 수정되었습니다.');
      setEditingTicket(null);
      fetchTickets();
      setTimeout(() => setApiSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setApiError('일정 수정에 실패했습니다.');
      setTimeout(() => setApiError(''), 3500);
    } finally {
      setLoading(false);
    }
  };

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

  // 에픽 목록 로드
  const fetchEpics = async () => {
    if (selectedProjectId === null) {
      setEpics([]);
      return;
    }
    try {
      const response = await axiosInstance.get(`/epics?project_id=${selectedProjectId}`);
      setEpics(response.data);
    } catch (err: any) {
      console.error('Failed to load epics:', err);
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

  // 탭 전환 시 및 선택된 프로젝트 변경 시 티켓 및 에픽 정보 갱신
  useEffect(() => {
    fetchTickets();
    fetchEpics();
    if (activeTab === 'kanban') {
      fetchTeamMembers();
    }
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

      const { created_epics_count, warning_epics_count, epics: newEpics } = response.data;
      setApiSuccess(`성공적으로 WBS 에픽 일정을 분해 및 생성했습니다! (에픽: ${created_epics_count}개, 상충 경고: ${warning_epics_count}개)`);
      
      // 기입 영역 비우기
      setProjectName('');
      setPrdContent('');
      setSpecContent('');

      // 프로젝트 목록 새로 로드하여 추가된 프로젝트 바인딩
      const projectListResponse = await axiosInstance.get('/projects');
      setProjects(projectListResponse.data);

      // 신규 프로젝트 ID 추출 및 지정
      if (newEpics.length > 0) {
        const newProjId = newEpics[0].project_id;
        setSelectedProjectId(newProjId);
      }
      
      setEpics(newEpics);
      
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

  const handleOpenEditEpicModal = (epic: EpicResponse) => {
    setEditingEpic(epic);
    setEditEpicStartDate(epic.start_date || '');
    setEditEpicDueDate(epic.due_date || '');
  };

  const handleSaveEpicDates = async () => {
    if (!editingEpic) return;
    try {
      setLoading(true);
      await axiosInstance.put(`/epics/${editingEpic.id}`, {
        start_date: editEpicStartDate || null,
        due_date: editEpicDueDate || null
      });
      setApiSuccess('에픽 일정이 성공적으로 수정되었습니다.');
      setEditingEpic(null);
      fetchEpics();
      setTimeout(() => setApiSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setApiError('에픽 일정 수정에 실패했습니다.');
      setTimeout(() => setApiError(''), 3500);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateEpicModal = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    setEpicCreateTitle('');
    setEpicCreateDescription('');
    setEpicCreateStartDate(todayStr);
    setEpicCreateDueDate(todayStr);
    setIsEpicCreateModalOpen(true);
  };

  const handleSaveEpic = async () => {
    if (!epicCreateTitle.trim()) {
      setApiError('에픽 제목을 입력해 주세요.');
      setTimeout(() => setApiError(''), 3500);
      return;
    }
    if (selectedProjectId === null) {
      setApiError('선택된 프로젝트가 없습니다.');
      setTimeout(() => setApiError(''), 3500);
      return;
    }
    try {
      setLoading(true);
      await axiosInstance.post('/epics', {
        project_id: selectedProjectId,
        title: epicCreateTitle,
        description: epicCreateDescription || null,
        start_date: epicCreateStartDate || null,
        due_date: epicCreateDueDate || null
      });
      setApiSuccess('에픽 일정이 성공적으로 추가되었습니다.');
      setIsEpicCreateModalOpen(false);
      fetchEpics();
      setTimeout(() => setApiSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setApiError(err.response.data.detail);
      } else {
        setApiError('에픽 일정 추가에 실패했습니다.');
      }
      setTimeout(() => setApiError(''), 3500);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQaStatus = async (itemId: number, newStatus: string) => {
    try {
      setLoading(true);
      await axiosInstance.patch(`/qa/items/${itemId}`, {
        status: newStatus
      });
      fetchTickets();
      setApiSuccess(`검수 상태가 성공적으로 변경되었습니다.`);
      setTimeout(() => setApiSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setApiError(err.response.data.detail);
      } else {
        setApiError('검수 상태 변경에 실패했습니다.');
      }
      setTimeout(() => setApiError(''), 3500);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEpic = (epicId: number | 'none') => {
    if (epicId === 'none') {
      setTicketFormData(prev => ({ ...prev, epic_ids: [] }));
    } else {
      const isSelected = ticketFormData.epic_ids.includes(epicId);
      let newEpicIds: number[];
      if (isSelected) {
        newEpicIds = ticketFormData.epic_ids.filter(id => id !== epicId);
      } else {
        newEpicIds = [...ticketFormData.epic_ids, epicId];
      }
      setTicketFormData(prev => ({ ...prev, epic_ids: newEpicIds }));
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setTicketFormData({
      id: undefined,
      title: '',
      description: '',
      status: 'TO_DO',
      priority: 'P1',
      assignee_id: null,
      epic_ids: [],
      need_functional_qa: false,
      functional_qa_title: '기능 검수 요건 기술',
      need_quality_qa: false,
      quality_qa_title: '품질 검수 요건 기술'
    });
    setIsTicketModalOpen(true);
  };

  const handleOpenEditTicketModal = (ticket: TicketResponse) => {
    setModalMode('edit');
    const funcItem = ticket.qa_items.find(item => item.category === 'FUNCTIONAL');
    const qualItem = ticket.qa_items.find(item => item.category === 'QUALITY');
    setTicketFormData({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description || '',
      status: ticket.status,
      priority: ticket.priority,
      assignee_id: ticket.assignee_id || null,
      epic_ids: ticket.epic_ids || [],
      need_functional_qa: !!funcItem,
      functional_qa_title: funcItem ? funcItem.title : '기능 검수 요건 기술',
      need_quality_qa: !!qualItem,
      quality_qa_title: qualItem ? qualItem.title : '품질 검수 요건 기술'
    });
    setIsTicketModalOpen(true);
  };

  const handleSaveTicket = async () => {
    if (!ticketFormData.title.trim()) {
      setApiError("태스크 제목을 입력해주세요.");
      setTimeout(() => setApiError(''), 3500);
      return;
    }

    if (currentUser && currentUser.role !== 'PM') {
      if (ticketFormData.assignee_id !== null && ticketFormData.assignee_id !== currentUser.id) {
        setApiError("자신이 아닌 다른 사용자를 담당자로 지정할 수 없습니다.");
        setTimeout(() => setApiError(''), 3500);
        return;
      }
    }

    try {
      setLoading(true);
      const payload = {
        title: ticketFormData.title,
        description: ticketFormData.description || null,
        status: ticketFormData.status,
        priority: ticketFormData.priority,
        assignee_id: ticketFormData.assignee_id,
        epic_ids: ticketFormData.epic_ids,
        need_functional_qa: ticketFormData.need_functional_qa,
        functional_qa_title: ticketFormData.need_functional_qa ? ticketFormData.functional_qa_title : null,
        need_quality_qa: ticketFormData.need_quality_qa,
        quality_qa_title: ticketFormData.need_quality_qa ? ticketFormData.quality_qa_title : null,
      };

      if (modalMode === 'create') {
        await axiosInstance.post('/tickets', {
          ...payload,
          project_id: selectedProjectId
        });
        setApiSuccess('새 태스크가 생성되었습니다.');
      } else {
         await axiosInstance.put(`/tickets/${ticketFormData.id}`, payload);
        setApiSuccess('태스크가 성공적으로 업데이트되었습니다.');
      }
      
      setIsTicketModalOpen(false);
      fetchTickets();
      setTimeout(() => setApiSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setApiError(err.response.data.detail);
      } else {
        setApiError('태스크 저장에 실패했습니다.');
      }
      setTimeout(() => setApiError(''), 3500);
    } finally {
      setLoading(false);
    }
  };

  // ==================== [새로고침 기능] ====================
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchProjects(), fetchTickets(), fetchEpics()]);
      setApiSuccess('데이터가 새로고침되었습니다.');
      setTimeout(() => setApiSuccess(''), 2000);
    } catch (err) {
      console.error(err);
      setApiError('새로고침 중 오류가 발생했습니다.');
      setTimeout(() => setApiError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== [간트 차트용 날짜 연산 함수] ====================
  const getGanttDateRange = () => {
    // start_date와 due_date가 존재하는 에픽만 필터링
    const datedEpics = epics.filter(e => e.start_date && e.due_date);
    if (datedEpics.length === 0) {
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

    let minDate = new Date(datedEpics[0].start_date!);
    let maxDate = new Date(datedEpics[0].due_date!);

    datedEpics.forEach(e => {
      const start = new Date(e.start_date!);
      const due = new Date(e.due_date!);
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

    const matchesMyTasks = !myTasksOnly || (currentUser && t.assignee_id === currentUser.id);
    
    return matchesSearch && matchesPriority && matchesMyTasks;
  });

  // QA 검수 상태 필터 조건
  const matchesQaStatus = (item: QAItemResponse) => {
    if (qaFilter === 'ALL') return true;
    if (qaFilter === 'UNTESTED') return item.status === 'UNTESTED';
    if (qaFilter === 'TESTED') return item.status === 'PASS' || item.status === 'FAIL';
    if (qaFilter === 'APPROVED') return item.status === 'APPROVED';
    return true;
  };

  // 기능검수 QA 항목 추출
  const functionalQaItems = tickets.flatMap(t => 
    t.qa_items
      .filter(item => item.category === 'FUNCTIONAL' && matchesQaStatus(item))
      .map(item => ({ ...item, ticketTitle: t.title }))
  );

  // 품질검수 QA 항목 추출
  const qualityQaItems = tickets.flatMap(t => 
    t.qa_items
      .filter(item => item.category === 'QUALITY' && matchesQaStatus(item))
      .map(item => ({ ...item, ticketTitle: t.title }))
  );

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
      {/* 5대 핵심 탭 메뉴 네비게이션 */}
      <div className="border-b border-slate-800 bg-[#070a13] px-6 py-3 flex flex-wrap gap-2">
        {currentUser && currentUser.role === 'PM' && (
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
        )}
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
        <div className="bg-[#121b2e] border-b border-slate-800 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
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
                {currentUser && currentUser.role === 'PM' 
                  ? "⚠️ 등록된 프로젝트가 없습니다. '프로젝트 생성' 탭에서 새 프로젝트를 등록해주세요." 
                  : "⚠️ 등록된 프로젝트가 없습니다. PM에게 프로젝트 등록을 요청해 주세요."}
              </span>
            )}
          </div>
          {projects.length > 0 && (
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-3 py-1.5 bg-[#1e293b] hover:bg-[#334155] border border-slate-750 hover:border-slate-600 rounded-lg text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition select-none disabled:opacity-50 shadow-sm"
              title="데이터 새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          )}
        </div>
      )}

      {/* 탭 개별 뷰 콘텐츠 영역 */}
      <div className="p-6 md:p-8">
        
        {/* ==================== [1. 프로젝트 생성 탭] ==================== */}
        {activeTab === 'project_create' && currentUser && currentUser.role === 'PM' && (
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  📊 프로젝트 타임라인 간트 차트 (Gantt Chart Timeline)
                </h3>
                <p className="text-slate-400 text-sm">각 개발 일정 티켓들의 시작일과 마감 마일스톤 범위를 시각적으로 가시화한 타임라인 그래프 뷰입니다.</p>
              </div>
              {currentUser && currentUser.role === 'PM' && (
                <Button 
                  onClick={handleOpenCreateEpicModal}
                  disabled={selectedProjectId === null}
                  className="px-3 py-1.5 flex items-center gap-1 text-xs self-start md:self-auto"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> 에픽 추가
                </Button>
              )}
            </div>

            {apiError && (
              <div className="bg-red-900/30 border border-red-500/50 text-red-200 text-sm p-4 rounded-lg animate-fade-in">
                ⚠️ {apiError}
              </div>
            )}
            {apiSuccess && (
              <div className="bg-green-900/30 border border-green-500/50 text-green-200 text-sm p-4 rounded-lg animate-pulse">
                ✓ {apiSuccess}
              </div>
            )}

            {epics.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-800 rounded-xl bg-[#070a13] text-center px-4">
                <Calendar className="w-12 h-12 text-slate-600 mb-4 animate-bounce" />
                <h4 className="text-white font-bold mb-1">생성된 WBS 에픽 일정이 없습니다.</h4>
                <p className="text-slate-500 text-sm mb-4 max-w-sm">프로젝트 생성 탭에서 기획 문서를 입력하고 AI 분석을 가동하여 간트 차트 에픽 타임라인을 확인하세요.</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button variant="primary" onClick={() => setActiveTab('project_create')} className="text-xs">
                    WBS 일정 생성하러 가기
                  </Button>
                  {currentUser && currentUser.role === 'PM' && (
                    <Button variant="secondary" onClick={handleOpenCreateEpicModal} disabled={selectedProjectId === null} className="text-xs">
                      수동 에픽 추가
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#070a13] border border-slate-800 rounded-xl overflow-x-auto p-6 shadow-lg">
                <div className="min-w-[800px] space-y-4">
                  {/* 타임라인 날짜 눈금 헤더 */}
                  <div className="flex text-slate-400 text-xs font-bold border-b border-slate-850 pb-2">
                    <div className="w-[280px] flex-shrink-0 text-slate-500 uppercase tracking-wider">개발 에픽 (일정명)</div>
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
                    {epics.map((epic) => {
                      const hasDates = epic.start_date && epic.due_date;
                      const barStyle = getGanttBarStyle(epic.start_date, epic.due_date);
                      const isAiDetected = epic.title.startsWith('[AI-Detected]');
                      const priorityColor = isAiDetected ? 'from-amber-500 to-amber-600 shadow-amber-500/20' : 'from-blue-500 to-brand-600 shadow-brand-500/20';
                      
                      return (
                        <div key={epic.id} className="flex items-center py-2 hover:bg-[#0f172a]/20 rounded transition">
                          {/* 왼쪽 태스크 라벨 정보 */}
                          <div className="w-[280px] flex-shrink-0 pr-4">
                            <div className="flex items-center gap-2">
                              {isAiDetected ? (
                                <span className="bg-amber-950/40 border border-amber-600/30 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  🤖 경고
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white bg-brand-650">
                                  EPIC
                                </span>
                              )}
                              <h4 className="font-medium text-slate-200 text-sm truncate" title={epic.title}>{epic.title}</h4>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>시작: {epic.start_date || '미지정'}</span>
                              <span>마감: {epic.due_date || '미지정'}</span>
                              {currentUser && currentUser.role === 'PM' && (
                                <button 
                                  onClick={() => handleOpenEditEpicModal(epic)}
                                  className="text-brand-400 hover:text-brand-300 transition underline cursor-pointer ml-1"
                                >
                                  기간 수정
                                </button>
                              )}
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
                                onClick={() => { if(currentUser?.role === 'PM') handleOpenEditEpicModal(epic); }}
                                className={`absolute h-4 top-1 rounded-full bg-gradient-to-r ${priorityColor} shadow-md flex items-center px-2 text-[9px] text-white font-bold select-none cursor-pointer hover:scale-[1.01] transition transform`}
                                title={`${epic.title} (${epic.start_date} ~ ${epic.due_date})`}
                              >
                                <span className="truncate">{epic.title}</span>
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
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={myTasksOnly}
                    onChange={(e) => setMyTasksOnly(e.target.checked)}
                    className="rounded bg-[#1e293b] border-slate-700 text-brand-500 focus:ring-brand-500 w-4 h-4" 
                  />
                  내 담당 작업만 보기
                </label>
                <Button 
                  onClick={handleOpenCreateModal} 
                  disabled={selectedProjectId === null}
                  className="px-3 py-1.5 flex items-center gap-1 text-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> 새 할 일 추가
                </Button>
                {currentUser && currentUser.role === 'PM' && (
                  <Button 
                    onClick={() => {
                      setIsAiFlinkModalOpen(true);
                      setSelectedEpicIdForFlink('');
                      setExcludeExistingTasks(false);
                      setFlinkRecommendations([]);
                    }}
                    className="px-3 py-1.5 flex items-center gap-1 text-xs bg-gradient-to-r from-purple-650 to-indigo-650 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-indigo-500/20"
                  >
                    🤖 인공지능 플링크
                  </Button>
                )}
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
                    <div key={ticket.id} className="bg-[#1e293b] border border-slate-700 p-4 rounded-lg shadow hover:border-slate-500 transition duration-150 text-left">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded text-white ${
                          ticket.priority === 'P0' ? 'bg-red-600' : ticket.priority === 'P2' ? 'bg-purple-600' : 'bg-brand-600'
                        }`}>{ticket.priority}</span>
                        <button 
                          onClick={() => handleOpenEditTicketModal(ticket)} 
                          className="text-[10px] text-brand-400 hover:text-brand-350 font-semibold transition bg-[#0f172a]/30 border border-slate-700/50 px-1.5 py-0.5 rounded"
                        >
                          수정
                        </button>
                      </div>
                      <h4 className="font-semibold text-white text-sm">{ticket.title}</h4>
                      {ticket.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ticket.description}</p>}
                      {ticket.epics && ticket.epics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {ticket.epics.map(ep => (
                            <span key={ep.id} className="text-[9px] bg-slate-800 border border-slate-700 text-slate-350 px-1.5 py-0.5 rounded-md truncate max-w-[120px] font-semibold" title={ep.title}>
                              🏷️ {ep.title}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* 담당자 지정 UI */}
                      <div className="mt-3 pt-2 border-t border-slate-700/50">
                        <label className="block text-[10px] text-slate-450 font-bold mb-1">👤 담당자 지정</label>
                        {currentUser && currentUser.role === 'PM' ? (
                          <select
                            value={ticket.assignee_id || ''}
                            onChange={(e) => handleUpdateAssignee(ticket.id, e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 focus:outline-none focus:border-brand-500 cursor-pointer"
                          >
                            <option value="">담당자 지정 안 함</option>
                            {teamMembers.map(member => (
                              <option key={member.id} value={member.id}>
                                {member.name} ({member.role})
                              </option>
                            ))}
                          </select>
                        ) : currentUser ? (
                          <select
                            value={ticket.assignee_id || ''}
                            onChange={(e) => handleUpdateAssignee(ticket.id, e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 focus:outline-none focus:border-brand-500 cursor-pointer"
                          >
                            <option value="">담당자 지정 안 함</option>
                            <option value={currentUser.id}>{currentUser.name} (나)</option>
                            {ticket.assignee_id && ticket.assignee_id !== currentUser.id && (
                              <option value={ticket.assignee_id} disabled>
                                {ticket.assignee?.name || '기타 담당자'}
                              </option>
                            )}
                          </select>
                        ) : (
                          <div className="text-xs text-slate-500">로그인 필요</div>
                        )}
                      </div>

                      {/* 상태 변경 UI */}
                      <div className="mt-2.5 pt-1.5 flex items-center justify-between gap-2 border-t border-slate-800/40">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">상태 변경</span>
                        <select
                          value={ticket.status}
                          onChange={(e) => handleUpdateStatus(ticket.id, e.target.value)}
                          className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-[11px] text-slate-300 focus:outline-none focus:border-brand-500 cursor-pointer"
                        >
                          <option value="TO_DO">To Do (대기)</option>
                          <option value="IN_PROGRESS">In Progress (진행 중)</option>
                          <option value="TO_REVIEW">To Review (검토 필요)</option>
                          <option value="DONE">Done (완료)</option>
                        </select>
                      </div>
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
                        className={`bg-[#1e293b] p-4 rounded-lg shadow transition duration-150 relative overflow-hidden text-left ${
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
                          <button 
                            onClick={() => handleOpenEditTicketModal(ticket)} 
                            className="text-[10px] text-brand-400 hover:text-brand-350 font-semibold transition bg-[#0f172a]/30 border border-slate-700/50 px-1.5 py-0.5 rounded"
                          >
                            수정
                          </button>
                        </div>
                        <h4 className="font-semibold text-white text-sm pr-4">{ticket.title}</h4>
                        {ticket.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ticket.description}</p>}
                        {ticket.epics && ticket.epics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {ticket.epics.map(ep => (
                              <span key={ep.id} className="text-[9px] bg-slate-800 border border-slate-700 text-slate-350 px-1.5 py-0.5 rounded-md truncate max-w-[120px] font-semibold" title={ep.title}>
                                🏷️ {ep.title}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* 담당자 노출 */}
                        {ticket.assignee && (
                          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                            <span>👤 담당자:</span>
                            <span className="font-medium text-slate-300">{ticket.assignee.name}</span>
                          </div>
                        )}

                        {/* 상태 변경 UI */}
                        <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">상태 변경</span>
                          <select
                            value={ticket.status}
                            onChange={(e) => handleUpdateStatus(ticket.id, e.target.value)}
                            className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-[11px] text-slate-300 focus:outline-none focus:border-brand-500 cursor-pointer"
                          >
                            <option value="TO_DO">To Do (대기)</option>
                            <option value="IN_PROGRESS">In Progress (진행 중)</option>
                            <option value="TO_REVIEW">To Review (검토 필요)</option>
                            <option value="DONE">Done (완료)</option>
                          </select>
                        </div>
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
                    <div key={ticket.id} className="bg-[#1e293b] border border-slate-700 p-4 rounded-lg shadow hover:border-slate-500 transition duration-150 text-left">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded text-white ${
                          ticket.priority === 'P0' ? 'bg-red-600' : ticket.priority === 'P2' ? 'bg-purple-600' : 'bg-brand-600'
                        }`}>{ticket.priority}</span>
                        <button 
                          onClick={() => handleOpenEditTicketModal(ticket)} 
                          className="text-[10px] text-brand-400 hover:text-brand-350 font-semibold transition bg-[#0f172a]/30 border border-slate-700/50 px-1.5 py-0.5 rounded"
                        >
                          수정
                        </button>
                      </div>
                      <h4 className="font-semibold text-white text-sm">{ticket.title}</h4>
                      {ticket.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ticket.description}</p>}
                      {ticket.epics && ticket.epics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {ticket.epics.map(ep => (
                            <span key={ep.id} className="text-[9px] bg-slate-800 border border-slate-700 text-slate-350 px-1.5 py-0.5 rounded-md truncate max-w-[120px] font-semibold" title={ep.title}>
                              🏷️ {ep.title}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* 담당자 노출 */}
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-brand-300 bg-brand-950/20 border border-brand-900/30 px-2 py-1 rounded">
                        <span>👤 담당자:</span>
                        <span className="font-semibold text-slate-200">{ticket.assignee?.name || '미지정'}</span>
                      </div>

                      {/* 상태 변경 UI */}
                      <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">상태 변경</span>
                        <select
                          value={ticket.status}
                          onChange={(e) => handleUpdateStatus(ticket.id, e.target.value)}
                          className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-[11px] text-slate-300 focus:outline-none focus:border-brand-500 cursor-pointer"
                        >
                          <option value="TO_DO">To Do (대기)</option>
                          <option value="IN_PROGRESS">In Progress (진행 중)</option>
                          <option value="TO_REVIEW">To Review (검토 필요)</option>
                          <option value="DONE">Done (완료)</option>
                        </select>
                      </div>
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
                    <div key={ticket.id} className="bg-[#1e293b] border border-slate-700 p-4 rounded-lg shadow hover:border-slate-500 transition duration-150 text-left">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded text-white ${
                          ticket.priority === 'P0' ? 'bg-red-600' : ticket.priority === 'P2' ? 'bg-purple-600' : 'bg-brand-600'
                        }`}>{ticket.priority}</span>
                        <button 
                          onClick={() => handleOpenEditTicketModal(ticket)} 
                          className="text-[10px] text-brand-400 hover:text-brand-350 font-semibold transition bg-[#0f172a]/30 border border-slate-700/50 px-1.5 py-0.5 rounded"
                        >
                          수정
                        </button>
                      </div>
                      <h4 className="font-semibold text-white text-sm">{ticket.title}</h4>
                      {ticket.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ticket.description}</p>}
                      {ticket.epics && ticket.epics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {ticket.epics.map(ep => (
                            <span key={ep.id} className="text-[9px] bg-slate-800 border border-slate-700 text-slate-350 px-1.5 py-0.5 rounded-md truncate max-w-[120px] font-semibold" title={ep.title}>
                              🏷️ {ep.title}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* 담당자 노출 */}
                      {ticket.assignee && (
                        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                          <span>👤 담당자:</span>
                          <span className="font-medium text-slate-300">{ticket.assignee.name}</span>
                        </div>
                      )}

                      {/* 상태 변경 UI */}
                      <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">상태 변경</span>
                        <select
                          value={ticket.status}
                          onChange={(e) => handleUpdateStatus(ticket.id, e.target.value)}
                          className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-[11px] text-slate-300 focus:outline-none focus:border-brand-500 cursor-pointer"
                        >
                          <option value="TO_DO">To Do (대기)</option>
                          <option value="IN_PROGRESS">In Progress (진행 중)</option>
                          <option value="TO_REVIEW">To Review (검토 필요)</option>
                          <option value="DONE">Done (완료)</option>
                        </select>
                      </div>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  🔍 기능 검수 명세 체크리스트 (Functional QA checklist)
                </h3>
                <p className="text-slate-400 text-sm">각 개발 티켓들과 1:N으로 바인딩되어 생성된 세부 기능 명세 검수 요건입니다.</p>
              </div>
              <div className="flex-shrink-0">
                <select 
                  value={qaFilter}
                  onChange={(e) => setQaFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-[#1e293b] border border-slate-700 rounded-lg text-white text-xs font-semibold focus:outline-none focus:border-brand-500 cursor-pointer"
                >
                  <option value="ALL">검수 상태 (전체)</option>
                  <option value="UNTESTED">검수대기 (UNTESTED)</option>
                  <option value="TESTED">검수완료 (PASS / FAIL)</option>
                  <option value="APPROVED">승인완료 (APPROVED)</option>
                </select>
              </div>
            </div>
            <div className="bg-[#070a13] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#121b2e] border-b border-slate-800 text-slate-300">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">검수 ID</th>
                    <th className="px-6 py-3.5 font-semibold">연계 칸반 티켓</th>
                    <th className="px-6 py-3.5 font-semibold">검수 검증 동작 조건</th>
                    <th className="px-6 py-3.5 font-semibold text-center">검수 상태 및 관리</th>
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
                        <div className="flex items-center justify-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold select-none ${
                            item.status === 'PASS' 
                              ? 'bg-green-950/40 border border-green-600/40 text-green-300' 
                              : item.status === 'FAIL' 
                                ? 'bg-red-950/40 border border-red-600/40 text-red-300' 
                                : item.status === 'APPROVED'
                                  ? 'bg-blue-950/40 border border-blue-600/40 text-blue-300'
                                  : 'bg-slate-800/40 border border-slate-600/40 text-slate-400'
                          }`}>
                            {item.status}
                          </span>
                          {currentUser && currentUser.role === 'QA' && item.status !== 'APPROVED' && (
                            <div className="flex gap-1">
                              <button 
                                onClick={() => handleUpdateQaStatus(item.id, 'PASS')}
                                className="px-2 py-0.5 bg-green-700 hover:bg-green-600 text-white rounded text-[11px] font-semibold transition"
                              >
                                성공
                              </button>
                              <button 
                                onClick={() => handleUpdateQaStatus(item.id, 'FAIL')}
                                className="px-2 py-0.5 bg-red-700 hover:bg-red-600 text-white rounded text-[11px] font-semibold transition"
                              >
                                실패
                              </button>
                            </div>
                          )}
                          {currentUser && currentUser.role === 'PM' && item.status === 'PASS' && (
                            <button 
                              onClick={() => handleUpdateQaStatus(item.id, 'APPROVED')}
                              className="px-2 py-0.5 bg-blue-700 hover:bg-blue-600 text-white rounded text-[11px] font-semibold transition"
                            >
                              승인
                            </button>
                          )}
                        </div>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  🛡️ 품질 검수 명세 체크리스트 (Quality QA Checklist)
                </h3>
                <p className="text-slate-400 text-sm">성능, 보안 및 코딩 스펙 제약 조건에 대한 품질 검증 가이드 리스트입니다.</p>
              </div>
              <div className="flex-shrink-0">
                <select 
                  value={qaFilter}
                  onChange={(e) => setQaFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-[#1e293b] border border-slate-700 rounded-lg text-white text-xs font-semibold focus:outline-none focus:border-brand-500 cursor-pointer"
                >
                  <option value="ALL">검수 상태 (전체)</option>
                  <option value="UNTESTED">검수대기 (UNTESTED)</option>
                  <option value="TESTED">검수완료 (PASS / FAIL)</option>
                  <option value="APPROVED">승인완료 (APPROVED)</option>
                </select>
              </div>
            </div>
            <div className="bg-[#070a13] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#121b2e] border-b border-slate-800 text-slate-300">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">검수 ID</th>
                    <th className="px-6 py-3.5 font-semibold">연계 칸반 티켓</th>
                    <th className="px-6 py-3.5 font-semibold">품질 검증 세부 요건</th>
                    <th className="px-6 py-3.5 font-semibold text-center">검수 상태 및 관리</th>
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
                        <div className="flex items-center justify-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold select-none ${
                            item.status === 'PASS' 
                              ? 'bg-green-950/40 border border-green-600/40 text-green-300' 
                              : item.status === 'FAIL' 
                                ? 'bg-red-950/40 border border-red-600/40 text-red-300' 
                                : item.status === 'APPROVED'
                                  ? 'bg-blue-950/40 border border-blue-600/40 text-blue-300'
                                  : 'bg-slate-800/40 border border-slate-600/40 text-slate-400'
                          }`}>
                            {item.status}
                          </span>
                          {currentUser && currentUser.role === 'QA' && item.status !== 'APPROVED' && (
                            <div className="flex gap-1">
                              <button 
                                onClick={() => handleUpdateQaStatus(item.id, 'PASS')}
                                className="px-2 py-0.5 bg-green-700 hover:bg-green-600 text-white rounded text-[11px] font-semibold transition"
                              >
                                성공
                              </button>
                              <button 
                                onClick={() => handleUpdateQaStatus(item.id, 'FAIL')}
                                className="px-2 py-0.5 bg-red-700 hover:bg-red-600 text-white rounded text-[11px] font-semibold transition"
                              >
                                실패
                              </button>
                            </div>
                          )}
                          {currentUser && currentUser.role === 'PM' && item.status === 'PASS' && (
                            <button 
                              onClick={() => handleUpdateQaStatus(item.id, 'APPROVED')}
                              className="px-2 py-0.5 bg-blue-700 hover:bg-blue-600 text-white rounded text-[11px] font-semibold transition"
                            >
                              승인
                            </button>
                          )}
                        </div>
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

      {/* 에픽 일정 수정 모달 */}
      {editingEpic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="bg-[#121b2e] border-b border-slate-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">📅 에픽 일정 기간 수정</h3>
              <button 
                onClick={() => setEditingEpic(null)}
                className="text-slate-400 hover:text-slate-200 transition font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">에픽명</label>
                <div className="bg-slate-900/50 border border-slate-800 text-slate-300 px-4 py-2.5 rounded-lg text-sm font-semibold truncate" title={editingEpic.title}>
                  {editingEpic.title}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">시작일</label>
                  <input 
                    type="date" 
                    value={editEpicStartDate}
                    onChange={(e) => setEditEpicStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">마감일</label>
                  <input 
                    type="date" 
                    value={editEpicDueDate}
                    onChange={(e) => setEditEpicDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#121b2e] border-t border-slate-700 px-6 py-4 flex justify-end gap-3">
              <button 
                onClick={() => setEditingEpic(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg text-xs font-semibold transition"
              >
                취소
              </button>
              <button 
                onClick={handleSaveEpicDates}
                className="px-4 py-2 bg-brand-500 text-white hover:bg-brand-600 rounded-lg text-xs font-semibold transition shadow-md shadow-brand-500/20"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 에픽 일정 추가 모달 */}
      {isEpicCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="bg-[#121b2e] border-b border-slate-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">📅 새 에픽 일정 추가</h3>
              <button 
                onClick={() => setIsEpicCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">에픽 제목</label>
                <input 
                  type="text" 
                  value={epicCreateTitle}
                  onChange={(e) => setEpicCreateTitle(e.target.value)}
                  placeholder="새 에픽의 제목을 입력하세요."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">설명</label>
                <textarea 
                  value={epicCreateDescription}
                  onChange={(e) => setEpicCreateDescription(e.target.value)}
                  placeholder="에픽 상세 설명을 입력하세요."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">시작일</label>
                  <input 
                    type="date" 
                    value={epicCreateStartDate}
                    onChange={(e) => setEpicCreateStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">마감일</label>
                  <input 
                    type="date" 
                    value={epicCreateDueDate}
                    onChange={(e) => setEpicCreateDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#121b2e] border-t border-slate-700 px-6 py-4 flex justify-end gap-3">
              <button 
                onClick={() => setIsEpicCreateModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg text-xs font-semibold transition"
              >
                취소
              </button>
              <button 
                onClick={handleSaveEpic}
                className="px-4 py-2 bg-brand-500 text-white hover:bg-brand-600 rounded-lg text-xs font-semibold transition shadow-md shadow-brand-500/20"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 새 할일 추가 / 내용 수정 모달 */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="bg-[#121b2e] border-b border-slate-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {modalMode === 'create' ? '➕ 새 할 일 추가' : '📝 할 일 수정'}
              </h3>
              <button 
                onClick={() => setIsTicketModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">할 일 제목</label>
                <input 
                  type="text" 
                  value={ticketFormData.title}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, title: e.target.value })}
                  placeholder="태스크 제목을 입력하세요."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">설명</label>
                <textarea 
                  value={ticketFormData.description}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, description: e.target.value })}
                  placeholder="세부 설명을 입력하세요."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">상태</label>
                  <select 
                    value={ticketFormData.status}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 cursor-pointer"
                  >
                    <option value="TO_DO">To Do (대기)</option>
                    <option value="IN_PROGRESS">In Progress (진행 중)</option>
                    <option value="TO_REVIEW">To Review (검토 필요)</option>
                    <option value="DONE">Done (완료)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">우선순위</label>
                  <select 
                    value={ticketFormData.priority}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 cursor-pointer"
                  >
                    <option value="P0">P0 (긴급)</option>
                    <option value="P1">P1 (보통)</option>
                    <option value="P2">P2 (낮음)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">담당자 지정</label>
                  {currentUser && currentUser.role === 'PM' ? (
                    <select
                      value={ticketFormData.assignee_id || ''}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, assignee_id: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 cursor-pointer"
                    >
                      <option value="">담당자 지정 안 함</option>
                      {teamMembers.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.role})
                        </option>
                      ))}
                    </select>
                  ) : currentUser ? (
                    <select
                      value={ticketFormData.assignee_id || ''}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, assignee_id: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 cursor-pointer"
                    >
                      <option value="">담당자 지정 안 함</option>
                      <option value={currentUser.id}>{currentUser.name} (나)</option>
                      {ticketFormData.assignee_id && ticketFormData.assignee_id !== currentUser.id && (
                        <option value={ticketFormData.assignee_id} disabled>
                          {teamMembers.find(m => m.id === ticketFormData.assignee_id)?.name || '기타 담당자'}
                        </option>
                      )}
                    </select>
                  ) : (
                    <div className="text-xs text-slate-500">로그인 필요</div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">연계 에픽 (중복 선택)</label>
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 space-y-2 max-h-[110px] overflow-y-auto">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={ticketFormData.epic_ids.length === 0}
                        onChange={() => handleToggleEpic('none')}
                        className="rounded bg-slate-950 border-slate-700 text-brand-500 focus:ring-brand-500 w-3.5 h-3.5 cursor-pointer" 
                      />
                      <span>에픽 연결 없음</span>
                    </label>
                    {epics.map(epic => (
                      <label key={epic.id} className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={ticketFormData.epic_ids.includes(epic.id)}
                          onChange={() => handleToggleEpic(epic.id)}
                          className="rounded bg-slate-950 border-slate-700 text-brand-500 focus:ring-brand-500 w-3.5 h-3.5 cursor-pointer" 
                        />
                        <span className="truncate" title={epic.title}>{epic.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">🛠️ QA 검수 체크리스트 설정</label>
                
                <div className="space-y-2 bg-[#121b2e] p-3 rounded-lg border border-slate-800">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={ticketFormData.need_functional_qa}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, need_functional_qa: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-brand-500 focus:ring-brand-500 w-4 h-4" 
                    />
                    기능검수 필요
                  </label>
                  {ticketFormData.need_functional_qa && (
                    <input 
                      type="text"
                      value={ticketFormData.functional_qa_title}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, functional_qa_title: e.target.value })}
                      placeholder="기능 검증 요건을 구체적으로 입력하세요."
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                    />
                  )}
                </div>

                <div className="space-y-2 bg-[#121b2e] p-3 rounded-lg border border-slate-800">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={ticketFormData.need_quality_qa}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, need_quality_qa: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-brand-500 focus:ring-brand-500 w-4 h-4" 
                    />
                    품질검수 필요
                  </label>
                  {ticketFormData.need_quality_qa && (
                    <input 
                      type="text"
                      value={ticketFormData.quality_qa_title}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, quality_qa_title: e.target.value })}
                      placeholder="품질 검증 요건을 구체적으로 입력하세요."
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[#121b2e] border-t border-slate-700 px-6 py-4 flex justify-end gap-3">
              <button 
                onClick={() => setIsTicketModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-350 hover:bg-slate-700 hover:text-white rounded-lg text-xs font-semibold transition"
              >
                취소
              </button>
              <button 
                onClick={handleSaveTicket}
                className="px-4 py-2 bg-brand-500 text-white hover:bg-brand-600 rounded-lg text-xs font-semibold transition shadow-md shadow-brand-500/20"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🤖 인공지능 플링크 추천 모달 */}
      {isAiFlinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left">
            {/* Header */}
            <div className="bg-[#121b2e] border-b border-slate-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                🤖 인공지능 플링크 할 일 추천
              </h3>
              <button 
                onClick={() => setIsAiFlinkModalOpen(false)}
                className="text-slate-400 hover:text-white transition text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* 에픽선택 콤보박스 */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  에픽 선택
                </label>
                <select 
                  value={selectedEpicIdForFlink}
                  onChange={(e) => setSelectedEpicIdForFlink(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 cursor-pointer"
                >
                  <option value="">-- 에픽을 선택하세요 --</option>
                  {epics.map((epic) => (
                    <option key={epic.id} value={epic.id}>
                      {epic.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* 기존할일제외 체크박스 */}
              <div className="flex items-center">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-350 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={excludeExistingTasks}
                    onChange={(e) => setExcludeExistingTasks(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-brand-500 focus:ring-brand-500 w-4 h-4 cursor-pointer" 
                  />
                  기존할일제외
                </label>
              </div>

              {/* 추천받기 버튼 */}
              <div className="flex justify-start">
                <Button 
                  onClick={handleGetFlinkRecommendations}
                  className="px-4 py-2 flex items-center gap-1.5 text-xs bg-gradient-to-r from-blue-500 to-brand-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-brand-650 shadow"
                >
                  추천받기
                </Button>
              </div>

              {/* AI 추천 할 일 리스트 그리드 */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  AI 추천 할 일 목록
                </label>
                <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900 max-h-[220px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#121b2e] border-b border-slate-750 text-slate-300 font-semibold sticky top-0">
                      <tr>
                        <th className="p-3 w-12 text-center">선택</th>
                        <th className="p-3 w-1/3">할 일 제목</th>
                        <th className="p-3">상세 내용</th>
                        <th className="p-3 w-16 text-center">우선순위</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      {flinkRecommendations.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-500 italic">
                            추천받기 버튼을 클릭하여 AI 추천 목록을 생성해 보세요.
                          </td>
                        </tr>
                      ) : (
                        flinkRecommendations.map((item) => (
                          <tr key={item.id} className="hover:bg-[#0f172a]/40 transition">
                            <td className="p-3 text-center">
                              <input 
                                type="checkbox" 
                                checked={item.selected}
                                onChange={() => handleToggleRecommendSelect(item.id)}
                                className="rounded bg-slate-950 border-slate-700 text-brand-500 focus:ring-brand-500 w-3.5 h-3.5 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 font-semibold text-white">{item.title}</td>
                            <td className="p-3 text-slate-450">{item.description}</td>
                            <td className="p-3 text-center">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${
                                item.priority === 'P0' ? 'bg-red-600' : item.priority === 'P2' ? 'bg-purple-600' : 'bg-brand-600'
                              }`}>
                                {item.priority}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Actions: 적용 / 닫기 */}
            <div className="bg-[#121b2e] border-t border-slate-700 px-6 py-4 flex justify-end gap-3">
              <button 
                onClick={() => setIsAiFlinkModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-350 hover:bg-slate-700 hover:text-white rounded-lg text-xs font-semibold transition"
              >
                닫기
              </button>
              <button 
                onClick={() => {
                  // 적용 기능은 현재 동작 단계 제외 (화면만 구현)
                  setIsAiFlinkModalOpen(false);
                }}
                className="px-4 py-2 bg-brand-500 text-white hover:bg-brand-600 rounded-lg text-xs font-semibold transition shadow-md shadow-brand-500/20"
              >
                적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
