# Graph Report - cloudChat  (2026-10-09)

## Corpus Check
- Corpus is ~2,013 words - fits in a single context window. You may not need a graph.

## Summary
- 74 nodes · 94 edges · 8 communities (0 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Messages Model
- Users Model
- Attachments Model
- Entity Annotations
- Application Tests
- Main Application
- Maven Package

## God Nodes (most connected - your core abstractions)
1. `Messages` - 15 edges
2. `Users` - 15 edges
3. `Attachments` - 13 edges
4. `CloudChatApplication` - 3 edges
5. `CloudChatApplicationTests` - 3 edges
6. `Conversations` - 2 edges
7. `com.chatApp:cloudChat` - 0 edges

## Surprising Connections (you probably didn't know these)
- `Attachments` --references--> `jakarta.persistence.Entity`  [EXTRACTED]
  src/main/java/com/chatApp/cloudChat/model/Attachments.java →   _Bridges community 2 → community 3_
- `Messages` --references--> `jakarta.persistence.Entity`  [EXTRACTED]
  src/main/java/com/chatApp/cloudChat/model/Messages.java →   _Bridges community 0 → community 3_
- `Users` --references--> `jakarta.persistence.Entity`  [EXTRACTED]
  src/main/java/com/chatApp/cloudChat/model/Users.java →   _Bridges community 1 → community 3_

## Import Cycles
- None detected.

## Communities (8 total, 8 thin omitted)

## Knowledge Gaps
- **1 isolated node(s):** `com.chatApp:cloudChat`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 36 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Messages` connect `Messages Model` to `Entity Annotations`?**
  _High betweenness centrality (0.236) - this node is a cross-community bridge._
- **What connects `com.chatApp:cloudChat` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Messages Model` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Why does `Users` connect `Users Model` to `Entity Annotations`?**
  _High betweenness centrality (0.236) - this node is a cross-community bridge._
- **Should `Users Model` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Why does `Attachments` connect `Attachments Model` to `Entity Annotations`?**
  _High betweenness centrality (0.207) - this node is a cross-community bridge._