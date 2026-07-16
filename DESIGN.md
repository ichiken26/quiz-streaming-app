---
name: Quiz Stream Control
description: Live production console with high-contrast broadcast cues.
colors:
  primary: "#62D9FF"
  secondary: "#E7FF5B"
  background: "#090B0F"
  surface: "#12151B"
  surface-raised: "#191D25"
  border: "#313744"
  text: "#F7F8FA"
  muted: "#A4ACBA"
  danger: "#FF6B6B"
  success: "#62E6A7"
typography:
  heading:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: 800
    lineHeight: 1.15
  body:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: Inter
    fontSize: 0.625rem
    fontWeight: 800
    lineHeight: 1.2
rounded:
  sm: 5px
  md: 8px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
components:
  button-primary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.background}"
    rounded: "{rounded.sm}"
    padding: 12px
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: 12px
---

## Overview

配信現場で迷わず操作できる、暗色ベースの高コントラストなコントロール画面です。
シアンは参加者・情報、ライムは管理操作・決定を示します。

## Colors

背景は黒に近い寒色で統一し、状態と操作だけにアクセント色を使います。

## Typography

見出しは太く短く、補助ラベルは小さな大文字、IDは等幅書体で表示します。

## Layout

情報は8px単位で配置し、編集画面は最大1200px、配信画面は最大1440pxとします。

## Elevation & Depth

影ではなく境界線と面の明度差で階層を表現します。

## Shapes

角丸は5pxから8pxに限定し、装飾的な大きな角丸は使用しません。

## Components

主要操作はライム、リンクと選択状態はシアン、破壊操作は赤で示します。

## Do's and Don'ts

- 操作結果と保存状態を必ずテキストでも伝えます。
- 色だけに依存せず、ラベル、アイコン、状態文言を併用します。
- 編集コンテンツを過度なカードの入れ子にしません。
