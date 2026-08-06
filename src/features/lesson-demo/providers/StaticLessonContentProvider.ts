import {
  getBarnSayItLesson,
  getCuratedLessonById,
  getCuratedLessonCatalog,
} from '../content/curatedLegacyLessons';
import {
  getDemoLessonById,
  getDemoLessonByWeekDay,
  getDemoLessons,
  getDemoRoadmap,
  getShowcaseDemoLessons,
} from '../content/sixMonthLessonPack';
import type { LessonAgeBand, LessonContentProvider, LessonRoadmapWeek, LessonSession } from '../types';

export class StaticLessonContentProvider implements LessonContentProvider {
  getTodaySession(ageBand: LessonAgeBand): LessonSession {
    if (ageBand === '4-6') {
      return getBarnSayItLesson(ageBand);
    }
    return getDemoLessonByWeekDay(1, 1, ageBand) ?? getDemoLessons(ageBand)[0];
  }

  getLessonById(lessonId: string, ageBand: LessonAgeBand = '7-9'): LessonSession | undefined {
    return getCuratedLessonById(lessonId, ageBand) ?? getDemoLessonById(lessonId, ageBand);
  }

  getLessonByWeekDay(week: number, day: number, ageBand: LessonAgeBand): LessonSession | undefined {
    return getDemoLessonByWeekDay(week, day, ageBand);
  }

  getRoadmap(ageBand: LessonAgeBand, completedLessonIds: string[] = []): LessonRoadmapWeek[] {
    return getDemoRoadmap(ageBand, completedLessonIds);
  }

  getShowcaseLessons(ageBand: LessonAgeBand): LessonSession[] {
    if (ageBand === '4-6') {
      return getCuratedLessonCatalog(ageBand);
    }
    return getShowcaseDemoLessons(ageBand);
  }
}

export const staticLessonContentProvider = new StaticLessonContentProvider();
