import { resolveClayExpression } from '../../src/character/expressions';

describe('resolveClayExpression', () => {
  it('maps lesson robot states to distinct eye and mouth pieces', () => {
    expect(resolveClayExpression('listening')).toMatchObject({ eye: 'wide', mouth: 'oh' });
    expect(resolveClayExpression('thinking')).toMatchObject({ eye: 'up', mouth: 'flat', dots: true });
    expect(resolveClayExpression('celebrating')).toMatchObject({ eye: 'happy', mouth: 'bigsmile' });
  });

  it('maps sprite poses used in the sunny lesson diorama', () => {
    expect(resolveClayExpression('listen')).toMatchObject({ eye: 'wide', mouth: 'oh' });
    expect(resolveClayExpression('think')).toMatchObject({ eye: 'up', mouth: 'flat' });
    expect(resolveClayExpression('celebrate')).toMatchObject({ eye: 'happy', mouth: 'bigsmile' });
  });

  it('switches to talk mouth while speaking', () => {
    expect(resolveClayExpression('idle', true)).toMatchObject({ mouth: 'talk' });
    expect(resolveClayExpression('modeling', true)).toMatchObject({ mouth: 'talk' });
  });
});