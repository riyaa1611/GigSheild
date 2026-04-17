import React from "react";
import Icon from "./Icon";
import { S } from "../styles/styles";

const tabs = [
  { id: "home", label: "Home", icon: "home" },
  { id: "policy", label: "Policy", icon: "shield" },
  { id: "payouts", label: "Payouts", icon: "payouts" },
  { id: "support", label: "Support", icon: "support" },
  { id: "profile", label: "Profile", icon: "user" },
];

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <div style={S.bottomNav}>
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button key={tab.id} onClick={() => onTabChange(tab.id)} style={S.navItem(active)}>
            <Icon name={tab.icon} size={22} color={active ? "#4ade80" : "rgba(255,255,255,0.35)"} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
