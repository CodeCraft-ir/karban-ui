export function tapFeedback(reduced:boolean,pressed:boolean) {
  if(reduced)return {scale:1,duration:0};
  return pressed?{scale:0.95,duration:0.12,ease:'power2.out'}:{scale:1,duration:0.55,ease:'elastic.out(1.1, 0.45)'};
}
