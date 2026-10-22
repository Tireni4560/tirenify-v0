import{j as e}from"./vendor-react-CiBELqhN.js";import{C as o,b as a,D as t,d as u,u as l,L as n,e as h}from"./index-AMSbYfkd.js";import{P as y}from"./ui-AUjQEFYx.js";const m={"/privacy":{title:"Privacy",body:[`What leaves your device. ${a} makes exactly one kind of outside request: when you
        run Breach Guard, your email is sent by POST to our own server, which asks ${t.name}
        to look it up. The email is sent to them to run the check. It is used only for that, never
        stored by us, and never written to logs or URLs.`,`Everything else stays on your device. The tools — password generator, strength checker,
        link and scam checkers, QR scanner, and every other page — make zero network requests. The
        text you paste and any password you type are never sent anywhere.`,`What is stored on your device. After a Breach Guard check we save a small summary in your
        browser: a masked email (like d***@gmail.com), the date, how many breaches were found, the
        list of exposed data types and the risk level. We never save your real email or the full
        results. Your safety-habit checkboxes and checkup answers are stored the same way. You can
        clear all of it at any time with "Clear data stored on this device".`,`What is never stored or logged. Your real email address and any password are never stored,
        never logged, and never placed in a URL. We do not use cookies for tracking, analytics, or
        advertising, and we do not build a profile of you.`,`Attribution. ${t.attribution}.`,`Questions. ${o} — see Help & Support.`]},"/terms":{title:"Terms",body:[`${a} is provided by ${o} free of charge, with no account and no signup.`,`No guarantee. Breach results come from a third-party database and may be incomplete or out of
        date. Finding no breaches is not proof you were never exposed. Link, scam and Wi-Fi tools are
        heuristic guides, not guarantees — no tool can guarantee safety. Always use your judgement.`,`Use at your own discretion. You are responsible for how you use the tools and for the safety
        of your own accounts. We are not liable for any loss arising from use of this site.`,`Changes. These terms and the tools may change over time. Continued use means you accept the
        current version.`]},"/about":{title:`About ${a}`,body:[`${a}. Our promise: "Know Before They Do."`,`${a} is a free hub for everyday digital safety. The tools run in your
        browser and nothing you type is sent to us. The only
        outside request is the Breach Guard check, which asks ${t.name} whether an email
        appears in known breaches.`,`Built for Africa first. The advice, scam examples and recovery guides are written with African
        context in mind — mobile money, bank and telco impersonation, BVN/NIN requests and more.`,`Data source. ${t.attribution}.`,"No accounts, no tracking, no ads. We don't ask you to sign up, and we don't track you.",`Last updated ${u}.`,`${a} is a product of ${o}.`]},"/help":{title:"Help & Support",body:[`What is Breach Guard? It checks whether your email appears in known data breaches. Enter your
        email, and we show which breaches included it, when, and what data was exposed.`,`Is anything stored? No. We don't ask for an account, and we never store your email or
        password. After a check we save only a small masked summary on your own device, which you
        can clear at any time.`,`Why does it say "no breaches found"? That means the email wasn't in the breaches we can see.
        It isn't proof you were never exposed — some leaks never become public.`,`A tool isn't working. Most tools run in your browser. If a page won't load, try
        reloading it.`,`Something looks wrong or you have feedback? Reach out to ${o}. We read every message.`]}};function g({route:r}){const{path:i}=l(),s=m[i]||{title:(r==null?void 0:r.title)||"Page",body:[]};return e.jsxs("div",{children:[e.jsx(y,{eyebrow:a,title:s.title}),e.jsx("div",{className:"space-y-4",children:s.body.map((d,c)=>e.jsx("p",{className:"text-sm leading-relaxed text-muted-foreground",children:d.trim()},c))}),e.jsxs("div",{className:"mt-8 flex flex-wrap gap-3",children:[e.jsx(n,{to:"/breach-guard",className:"rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground",children:"Run Breach Guard"}),e.jsx(n,{to:"/",className:"rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-secondary",children:"Back to dashboard"})]}),e.jsxs("p",{className:"mt-8 text-xs text-muted-foreground",children:[a," ",e.jsx("span",{className:"text-xs",children:"by"})," ",e.jsx(h,{variant:"horizontal",height:22,className:"inline shrink-0",alt:"Tirenify"}),"."]})]})}export{g as default};
