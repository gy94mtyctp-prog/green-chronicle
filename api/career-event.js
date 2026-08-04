export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.DEEPSEEK_API_KEY) {
    return res.status(503).json({ error: "DEEPSEEK_API_KEY is not configured" });
  }

  try {
    const context = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    let prompt = `You are the narrative director of a realistic Chinese football career simulation.
Write in Simplified Chinese. Create one detailed, novel-like event for this player. The event must be believable for the stated age, height, weight, club, league, position, current attributes, identity, and recent history. Do not claim invented real-world transfer news as fact. Avoid melodrama and keep the consequences proportionate.

Write like grounded sports fiction: open with a specific physical detail from the ground, tunnel, gym, or dressing room; put the player under a concrete tactical or personal pressure; let a coach, teammate, or opponent reveal an opposing point of view through action or dialogue; and end at the point where a decision has a real cost. Make the position and body type materially affect the scene. Do not use generic praise, generic training montages, or empty motivational slogans. The choices must represent distinct football philosophies such as disciplined improvement, calculated risk, team responsibility, or individual ambition. Remember earlier choices and let them shape how staff and teammates see the player.

The Player context contains storyGuide, decisionHistory, and relationships. storyGuide is mandatory: build this event around its theme and pressure, and make its named relationship matter. decisionHistory is persistent canon, not optional background. Never repeat a theme found in recent decisionHistory. eventSeed only tells you the point in the season; do not reuse its plot, title, characters, or choices. The event should feel like a new chapter in one continuous career, with consequences that can recur later.

eventKind is mandatory and changes the structure. For development, create a quarterly individual development plan with concrete training methods, recovery costs, and four distinct growth paths; do not pretend it is a match. For summer-transfer or winter-transfer, create four genuinely different career routes based on age, OVR, reputation, club level, and playing-time prospects. Every proposed club must be a real club, but label all transfer interest as hypothetical. Include club and league fields in transfer choices. For match or story, create a unique tactical or personal crisis. When a choice depends on a technical action, attach a requirements object using only OVR, REP, PAC, SHO, PAS, DRI, DEF, PHY with a realistic minimum. For example, a difficult finish needs SHO, a disguised long pass needs PAS, and a high-risk dribble needs DRI. At least one option should sometimes be locked, and at least one option must always be available.

life is another persistent part of the simulation. Fame reflects public visibility, professionalism reflects training and team reliability, and wealth reflects career earnings. Use them when relevant: a high-fame player may attract media pressure, low professionalism can affect a coach's trust, and a transfer can materially affect wealth. A decision can optionally return fame, professionalism, and wealth changes. fame and professionalism must be integers from -3 to 3; wealth must be an integer from -5000 to 10000 in EUR. Do not make every choice change all three.

Return only valid JSON, with no Markdown fences. Its exact top-level shape must be {"title":string,"text":string,"choices":array}. The text must be 2-4 Chinese paragraphs separated by \n\n. choices must contain exactly 4 objects, each shaped as {"t":string,"d":string,"effect":object,"form":number,"rep":number,"fit":number}. A choice may additionally contain requirements, club, league, fame, professionalism, and wealth. Each choice must be distinct, concise, and have a trade-off. effect may only use PAC, SHO, PAS, DRI, DEF, PHY as keys and each effect value must be between -2 and 3. requirements may only use OVR, REP, PAC, SHO, PAS, DRI, DEF, PHY with numeric minimum values. form must be -2 to 3, rep must be -3 to 4, and fit must be -8 to 5.

Player context:
${JSON.stringify(context)}`;

    if (context.mode === "custom") {
      prompt = `You are a strict, realistic evaluator for a Chinese football career simulation. Write in Simplified Chinese. Assess the player's custom decision using their age, height, weight, position, club, league, identity, current event, storyGuide, decisionHistory, relationships, attributes, and recent history. The impact must be proportional: do not reward implausible actions, and acknowledge trade-offs. Explain the immediate consequence through a concrete football detail and make the decision reinforce or challenge the player's established identity. Treat the listed previous decisions as established canon, and make the named relationship in storyGuide react plausibly.

Return only valid JSON, with no Markdown fences. Use exactly this shape: {"effect":object,"form":number,"rep":number,"fit":number,"outcome":string}. effect may only use PAC, SHO, PAS, DRI, DEF, PHY as keys and each value must be between -2 and 3. form must be -2 to 3, rep must be -3 to 4, fit must be -8 to 5. outcome is a detailed 2-3 sentence Chinese consequence written in a grounded novel-like tone.

Player context:
${JSON.stringify(context)}

Custom decision:
${context.customChoice}`;
    }

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        temperature: 0.85,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You produce strictly valid JSON for a football career simulator." },
          { role: "user", content: prompt }
        ]
      })
    });
    if (!response.ok) return res.status(response.status).json({ error: "DeepSeek request failed", detail: await response.text() });
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) throw new Error("DeepSeek returned no event content");
    return res.status(200).json(JSON.parse(content));
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Unexpected error" });
  }
}
