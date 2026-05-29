type ActionSheetDismissGesture = {
  translateY: number;
  velocityY: number;
};

export function shouldDismissActionSheet({ translateY, velocityY }: ActionSheetDismissGesture) {
  "worklet";

  const projected = translateY + velocityY * 0.12;

  return velocityY > 650 || projected > 96;
}
