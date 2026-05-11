export const shadows = {
  card: {
    web: '0 4px 12px rgba(0,0,0,0.08)',
    rn: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  },
  pill: {
    web: '0 4px 12px rgba(0,0,0,0.1)',
    rn: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  },
  button: {
    web: '0 2px 8px rgba(0,0,0,0.12)',
    rn: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  },
};

export default shadows;
