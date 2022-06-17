// Quick-n-dirty script to use in a browser console to demean the shapes for all agents. Put the contents of agents.json
// in a variable named `agents` and then run this.
JSON.stringify(agents.map(a => {
  let [meanX, meanY] = a.shape.reduce(([prevX, prevY], [newX, newY]) => [prevX + newX, prevY + newY], [0, 0])
  meanX /= a.shape.length
  meanY /= a.shape.length
  a.shape = a.shape.map(([x, y]) => [x - meanX, y - meanY])
  return a
}), undefined, 4)