describe('purchase entitlement refresh', () => {
  it('shares concurrent refreshes and allows a later refresh after settle', async () => {
    jest.resetModules();
    const get = jest.fn()
      .mockResolvedValueOnce({
        data: {
          data: {
            courses: ['hello-friends'],
            subscription_status: 'active',
            robot_activated: true,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            courses: ['hello-friends', 'animals'],
            subscription_status: 'active',
            robot_activated: true,
          },
        },
      });

    jest.doMock('@/services/http/client', () => ({
      __esModule: true,
      default: { get },
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { refreshEntitlementsAfterPurchase } = require('@/services/api/account') as typeof import('@/services/api/account');

    const [first, second] = await Promise.all([
      refreshEntitlementsAfterPurchase(),
      refreshEntitlementsAfterPurchase(),
    ]);

    expect(get).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
    expect(first).toEqual({
      courses: ['hello-friends'],
      subscriptionStatus: 'active',
      robotActivated: true,
    });

    await expect(refreshEntitlementsAfterPurchase()).resolves.toEqual({
      courses: ['hello-friends', 'animals'],
      subscriptionStatus: 'active',
      robotActivated: true,
    });
    expect(get).toHaveBeenCalledTimes(2);
  });
});
