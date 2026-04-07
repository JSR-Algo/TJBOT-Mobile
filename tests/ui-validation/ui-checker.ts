export interface UICheck {
  name: string;
  type: 'render' | 'accessibility' | 'layout' | 'interaction';
  passed: boolean;
  details: string;
}

export interface UIValidationResult {
  component: string;
  checks: UICheck[];
  score: number;
  passed: boolean;
  timestamp: string;
}

export function validateComponentJSON(componentName: string, json: unknown): UIValidationResult {
  const checks: UICheck[] = [];

  // Render check
  checks.push({
    name: 'renders_successfully',
    type: 'render',
    passed: json !== null && json !== undefined,
    details: json ? 'Component rendered' : 'Component returned null',
  });

  // Structure check
  const jsonStr = JSON.stringify(json);
  const hasChildren = jsonStr.length > 10;
  checks.push({
    name: 'has_content',
    type: 'render',
    passed: hasChildren,
    details: hasChildren ? 'Component has content' : 'Component appears empty',
  });

  // Accessibility: check for accessibilityLabel or testID patterns
  const hasAccessibility = jsonStr.includes('accessible') || jsonStr.includes('testID');
  checks.push({
    name: 'accessibility_props',
    type: 'accessibility',
    passed: true, // Advisory, not blocking
    details: hasAccessibility ? 'Accessibility props found' : 'Consider adding accessibilityLabel',
  });

  // Layout: check root has style
  const hasStyle = jsonStr.includes('style');
  checks.push({
    name: 'has_styling',
    type: 'layout',
    passed: hasStyle,
    details: hasStyle ? 'Styles applied' : 'No styles found',
  });

  const passed = checks.filter((c) => c.passed).length;
  const total = checks.length;
  const score = Math.round((passed / total) * 100);

  return {
    component: componentName,
    checks,
    score,
    passed: score >= 75,
    timestamp: new Date().toISOString(),
  };
}
