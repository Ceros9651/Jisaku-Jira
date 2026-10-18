# Spec Delta

## ADDED Requirements

### Requirement: プロジェクトごとの PBI の ID 採番
システムは、PBI を作成した順に、プロジェクトごとに `PBI-1`, `PBI-2`, `PBI-3`, … の ID を付与 SHALL する。番号はプロジェクトの中での連番で、そのプロジェクトでそれまでに発行した最大の番号に1を足した値とする。他のプロジェクトで発行した番号は影響しない。別々のプロジェクトに同じ番号の PBI があってよいが、1つのプロジェクトの中では番号は重複しない。一度付与した ID は変更せず、PBI を削除してもそのプロジェクトでその番号を再利用しない。

#### Scenario: 最初の PBI
- **WHEN** PBI が一度も作られていないプロジェクトで PBI を作成する
- **THEN** その PBI の ID は `PBI-1` になる

#### Scenario: 続けて作成する
- **WHEN** あるプロジェクトに `PBI-1` と `PBI-2` がある状態で、そのプロジェクトで PBI を作成する
- **THEN** 新しい PBI の ID は `PBI-3` になる

#### Scenario: 削除した番号は欠番になる
- **WHEN** あるプロジェクトに `PBI-1`〜`PBI-3` がある状態で `PBI-3` を削除し、その後そのプロジェクトで PBI を作成する
- **THEN** 新しい PBI の ID は `PBI-4` になり、そのプロジェクトで `PBI-3` は再び使われない

#### Scenario: 並べ替えても ID は変わらない
- **WHEN** `PBI-2` をバックログの先頭に移動する
- **THEN** 移動した PBI の ID は `PBI-2` のままで、他の PBI の ID も変わらない

#### Scenario: プロジェクトごとに 1 から振る
- **WHEN** プロジェクト「Jisaku-Jira-App」に `PBI-1`〜`PBI-9` があり、PBI の無い「Yarikuri」を選んで PBI を作成する
- **THEN** 「Yarikuri」に作られた PBI の ID は `PBI-1` になる

#### Scenario: 他のプロジェクトの作成は番号に影響しない
- **WHEN** 「Web」に `PBI-1` と `PBI-2`、「Tool」に `PBI-1` がある状態で、「Web」で PBI を作成し、そのあと「Tool」で PBI を作成する
- **THEN** 「Web」に作られた PBI は `PBI-3`、「Tool」に作られた PBI は `PBI-2` になる

#### Scenario: 新しく作ったプロジェクトも 1 から
- **WHEN** 他のプロジェクトに PBI がある状態でプロジェクト「Docs」を作成し、「Docs」で PBI を作成する
- **THEN** 「Docs」に作られた PBI の ID は `PBI-1` になる

#### Scenario: 削除したプロジェクトは他のプロジェクトの番号に影響しない
- **WHEN** 「Web」に `PBI-1` と `PBI-2`、「Tool」に `PBI-1`〜`PBI-4` がある状態で「Tool」を削除し、「Web」で PBI を作成する
- **THEN** 新しい PBI の ID は `PBI-3` になる

## REMOVED Requirements

### Requirement: PBI の ID 採番
**Reason**: 番号を全プロジェクトの通し番号で振ると、あるプロジェクトの番号が他のプロジェクトの PBI の数に左右される（PBI-11）。プロジェクトごとの連番に置き換える。
**Migration**: 「プロジェクトごとの PBI の ID 採番」に従う。既存の共有データと version 2 のファイルは、backlog-storage の「通し番号の共有データの振り直し」「旧形式のデータの読み込み」で番号を振り直す。
