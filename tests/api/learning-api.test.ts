import client from '@/services/http/client';
import {
  getChildProfile,
  getKPIs,
  getPronunciationTrend,
  updateChildProfile,
} from '@/services/api/learning';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
  },
}));

const mockedClient = client as jest.Mocked<typeof client>;

describe('learning API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads child profile including lesson filter personality fields', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        data: {
          id: 'child-1',
          name: 'Mai',
          vocabulary_level: 'beginner',
          speaking_confidence: 50,
          listening_score: 40,
          interests: ['animals', 'space'],
          attention_span_seconds: 180,
          learning_style: 'visual',
          parent_career: 'engineer',
        },
      },
    });

    await expect(getChildProfile('child-1')).resolves.toMatchObject({
      id: 'child-1',
      interests: ['animals', 'space'],
      learning_style: 'visual',
      parent_career: 'engineer',
    });
    expect(mockedClient.get).toHaveBeenCalledWith('/learning/children/child-1/profile');
  });

  it('updates safe personality fields used by lesson personalization', async () => {
    mockedClient.put.mockResolvedValueOnce({
      data: {
        id: 'child-1',
        name: 'Mai',
        vocabulary_level: 'basic',
        speaking_confidence: 55,
        listening_score: 45,
        interests: ['music'],
        attention_span_seconds: 180,
        learning_style: 'interactive',
        parent_career: 'teacher',
      },
    });

    await expect(updateChildProfile('child-1', {
      interests: ['music'],
      learning_style: 'interactive',
      vocabulary_level: 'basic',
      parent_career: 'teacher',
    })).resolves.toMatchObject({ parent_career: 'teacher', interests: ['music'] });
    expect(mockedClient.put).toHaveBeenCalledWith('/learning/children/child-1/profile', {
      interests: ['music'],
      learning_style: 'interactive',
      vocabulary_level: 'basic',
      parent_career: 'teacher',
    });
  });

  it('reads KPI and pronunciation analysis dashboards from the parent-safe learning tree', async () => {
    mockedClient.get
      .mockResolvedValueOnce({ data: { data: { engagement_score: 80, retention_rate: 75, weak_words: ['red'] } } })
      .mockResolvedValueOnce({ data: { avg_score: 72, trend: 'improving', points: [{ date: '2026-06-18', score: 72 }] } });

    await expect(getKPIs('child-1')).resolves.toMatchObject({ engagement_score: 80, retention_rate: 75 });
    await expect(getPronunciationTrend('child-1', 14)).resolves.toMatchObject({ avg_score: 72, trend: 'improving' });
    expect(mockedClient.get).toHaveBeenNthCalledWith(1, '/learning/children/child-1/kpis');
    expect(mockedClient.get).toHaveBeenNthCalledWith(2, '/learning/children/child-1/pronunciation-trend?days=14');
  });
});
