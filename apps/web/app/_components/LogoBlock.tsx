export default function LogoBlock() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '28px',
        height: '28px',
        background: 'var(--color-brand)',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#12120F',
        fontSize: '14px',
        fontWeight: 500,
        flexShrink: 0,
      }}>
        M
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
          Mocktail
        </span>
      </div>
    </div>
  );
}
