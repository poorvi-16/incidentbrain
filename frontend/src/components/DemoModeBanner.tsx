type Props = {
  visible: boolean;
};

function DemoModeBanner({ visible }: Props) {
  if (!visible) return null;

  return (
    <div className="border-b border-amber-400/20 bg-amber-500/10">
      <div className="section-shell py-3">
        <p className="text-center text-sm font-medium text-amber-200">
          Running in demo mode — using sample data
        </p>
      </div>
    </div>
  );
}

export default DemoModeBanner;
