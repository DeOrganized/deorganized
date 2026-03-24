# DeOrganized — Nos Implementation Plan
**Django Backend + React / TypeScript Frontend**
**Your teammate owns: Node.js services (DAP ledger, deposit watcher, agent runtime, game sessions)**
**Date: March 2026**

---

## How To Read This

You own the Django backend and the React/Vite/TypeScript frontend.
Your teammate's Node.js services are a black box — this plan defines exactly
what they expose to you and what you expose to them.

Every section answers:
1. What already exists in your codebase
2. What the gap is
3. Exactly what to build
4. The contract at the Node.js boundary

**Priority tiers:**
- 🔴 P0 — Credit loop must function (grant deliverable)
- 🟡 P1 — Pilot communities live (Bitflow, Xenitron, Skullcoin)
- 🟢 P2 — Public launch, creator self-service
- ⚪ P3 — Phase 4–5 scope

---

## The Boundary: What Node.js Calls on You

Your teammate's Node.js services will call these Django endpoints.
Build them first — Node.js is blocked without them.

```
# Credit transactions — Node.js is the only caller
POST /api/internal/credits/transact/
  headers: X-Internal-Secret: <shared_secret>
  body: {
    user_id: string,
    amount: number,           # positive = award, negative = deduct
    source: string,           # 'game' | 'game_entry' | 'reward' | 'purchase' | ...
    description: string,
    community_id?: string,
    reference_id?: string,    # idempotency key — same ref_id = no-op
    is_purchased?: boolean    # true = bought with STX, false = earned through activity
  }
  returns 200: { status: 'awarded'|'deducted', balance: number, created: boolean }
  returns 402: { error: 'Insufficient credits' }

# User lookup by wallet — deposit watcher needs this
GET /api/internal/users/by-stx-address/<stx_address>/
  headers: X-Internal-Secret: <shared_secret>
  returns 200: { id: string, username: string }
  returns 404: { error: 'Not found' }

# Feed event write — agent actions, game sessions post here
POST /api/internal/communities/<slug>/feed/
  headers: X-Internal-Secret: <shared_secret>
  body: {
    event_type: string,
    title: string,
    body?: string,
    metadata?: object,
    actor_id?: string
  }
  returns 201: { id: string }
```

**Permission class for all internal endpoints:**

```python
# shared/permissions.py
from rest_framework.permissions import BasePermission
from django.conf import settings

class InternalServicePermission(BasePermission):
    """
    Only Node.js services with the shared secret can call internal endpoints.
    Header: X-Internal-Secret: <NOS_INTERNAL_SECRET>
    Never use this on user-facing endpoints.
    """
    def has_permission(self, request, view):
        secret = request.headers.get('X-Internal-Secret')
        return bool(secret and secret == settings.NOS_INTERNAL_SECRET)
```

**Settings:**

```python
# settings.py
NOS_INTERNAL_SECRET = env('NOS_INTERNAL_SECRET')
CREATOR_ENGAGEMENT_THRESHOLD = env.int('CREATOR_ENGAGEMENT_THRESHOLD', default=500)
GAME_ENTRY_COST = env.int('GAME_ENTRY_COST', default=10)
```

---

## Part 1 — Django: Extend the Credit System 🔴 P0

### 1.1 Extend DappPointEvent

**Current state:** `DappPointEvent` model exists. Points awarded via `x402_required`
decorator on STX/USDCx/sBTC payment transactions.

**Gap:** No non-payment credit events (games, contests, participation), no
earned-vs-purchased split, no idempotency, no community context, no deduction.

**Migration is non-destructive — all new fields are nullable or have defaults.**

```python
# users/models.py — extend DappPointEvent

class DappPointEvent(models.Model):
    # ── existing fields ── keep everything, add below ──

    SOURCE_PAYMENT      = 'payment'       # existing x402 transactions
    SOURCE_GAME         = 'game'          # game session payout (Node.js)
    SOURCE_GAME_ENTRY   = 'game_entry'    # game entry fee deduction (Node.js)
    SOURCE_CONTEST      = 'contest'       # contest entry / win
    SOURCE_PARTICIPATION= 'participation' # daily / milestone bonuses
    SOURCE_PURCHASE     = 'purchase'      # direct STX → credits (Node.js deposit watcher)
    SOURCE_TOOL_USE     = 'tool_use'      # creator tool spend
    SOURCE_AGENT        = 'agent'         # agent operation (Node.js)
    SOURCE_REWARD       = 'reward'        # sponsor / tournament payout (Node.js)

    source = models.CharField(
        max_length=30,
        default='payment',
        choices=[
            (SOURCE_PAYMENT,       'Payment'),
            (SOURCE_GAME,          'Game Payout'),
            (SOURCE_GAME_ENTRY,    'Game Entry'),
            (SOURCE_CONTEST,       'Contest'),
            (SOURCE_PARTICIPATION, 'Participation'),
            (SOURCE_PURCHASE,      'Direct Purchase'),
            (SOURCE_TOOL_USE,      'Tool Use'),
            (SOURCE_AGENT,         'Agent Operation'),
            (SOURCE_REWARD,        'Reward'),
        ]
    )

    # Earned through activity vs bought with STX — drives engagement gating
    is_purchased = models.BooleanField(default=False)

    # Which community this credit event belongs to
    community = models.ForeignKey(
        'communities.Community',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='credit_events'
    )

    # Idempotency — Node.js passes this, same ref_id = no-op
    reference_id = models.CharField(max_length=255, unique=True, null=True, blank=True)

    # Human-readable label for the credits panel in the UI
    description = models.CharField(max_length=200, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['community', '-created_at']),
            models.Index(fields=['reference_id']),
        ]
```

### 1.2 Credit Manager

All credit reads and writes go through this. Never touch `DappPointEvent` directly
outside of it.

```python
# users/credit_manager.py

from django.db import transaction
from django.db.models import Sum
from .models import DappPointEvent, User

class CreditManager:

    @staticmethod
    def balance(user) -> int:
        result = DappPointEvent.objects.filter(
            user=user
        ).aggregate(total=Sum('amount'))
        return result['total'] or 0

    @staticmethod
    def earned_balance(user) -> int:
        """Credits earned through activity only. Used for engagement gating."""
        result = DappPointEvent.objects.filter(
            user=user,
            is_purchased=False,
            amount__gt=0
        ).aggregate(total=Sum('amount'))
        return result['total'] or 0

    @staticmethod
    def award(user, amount: int, source: str, description: str = '',
              community=None, reference_id: str = None,
              is_purchased: bool = False):
        """
        Award credits. Idempotent via reference_id.
        Returns (event, created).
        """
        if amount <= 0:
            raise ValueError("amount must be positive — use deduct() for spending")

        kwargs = dict(
            user=user,
            amount=amount,
            source=source,
            description=description,
            community=community,
            is_purchased=is_purchased,
        )
        if reference_id:
            return DappPointEvent.objects.get_or_create(
                reference_id=reference_id,
                defaults=kwargs
            )
        event = DappPointEvent.objects.create(**kwargs)
        return event, True

    @staticmethod
    def deduct(user, amount: int, source: str, description: str = '',
               community=None, reference_id: str = None) -> bool:
        """
        Deduct credits atomically. Returns False if insufficient balance.
        """
        if amount <= 0:
            raise ValueError("amount must be positive")

        with transaction.atomic():
            # Lock user row to prevent race conditions
            User.objects.select_for_update().get(pk=user.pk)
            if CreditManager.balance(user) < amount:
                return False
            DappPointEvent.objects.create(
                user=user,
                amount=-amount,
                source=source,
                description=description,
                community=community,
                reference_id=reference_id,
            )
            return True
```

### 1.3 Internal Transact Endpoint

This is what your teammate's Node.js services call for every credit operation.

```python
# users/views.py

from .credit_manager import CreditManager
from shared.permissions import InternalServicePermission

class InternalCreditTransactView(APIView):
    permission_classes = [InternalServicePermission]

    def post(self, request):
        user_id    = request.data.get('user_id')
        amount     = request.data.get('amount')
        source     = request.data.get('source')
        desc       = request.data.get('description', '')
        comm_id    = request.data.get('community_id')
        ref_id     = request.data.get('reference_id')
        is_purch   = request.data.get('is_purchased', False)

        if not all([user_id, amount is not None, source]):
            return Response({'error': 'user_id, amount, source required'}, status=400)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        community = None
        if comm_id:
            from communities.models import Community
            community = Community.objects.filter(id=comm_id).first()

        if amount > 0:
            _, created = CreditManager.award(
                user=user, amount=amount, source=source,
                description=desc, community=community,
                reference_id=ref_id, is_purchased=is_purch
            )
            return Response({
                'status': 'awarded',
                'created': created,
                'balance': CreditManager.balance(user)
            })
        else:
            success = CreditManager.deduct(
                user=user, amount=abs(amount), source=source,
                description=desc, community=community, reference_id=ref_id
            )
            if not success:
                return Response({'error': 'Insufficient credits'}, status=402)
            return Response({
                'status': 'deducted',
                'balance': CreditManager.balance(user)
            })


class InternalUserByAddressView(APIView):
    permission_classes = [InternalServicePermission]

    def get(self, request, stx_address):
        try:
            user = User.objects.get(stx_address=stx_address)
            return Response({'id': str(user.id), 'username': user.username})
        except User.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
```

### 1.4 Credits Balance Endpoint (Frontend-Facing)

```python
# users/views.py

class CreditsBalanceView(APIView):
    """Called by the React frontend to display the credits panel."""

    def get(self, request):
        from .credit_manager import CreditManager
        from django.conf import settings

        balance = CreditManager.balance(request.user)
        earned  = CreditManager.earned_balance(request.user)
        recent  = DappPointEvent.objects.filter(
            user=request.user
        ).order_by('-created_at')[:10]

        return Response({
            'balance': balance,
            'earned_total': earned,
            'engagement_threshold_met': earned >= settings.CREATOR_ENGAGEMENT_THRESHOLD,
            'recent': DappPointEventSerializer(recent, many=True).data,
        })
```

**URL entries:**

```python
# users/urls.py
path('credits/balance/',                    CreditsBalanceView.as_view()),
path('internal/credits/transact/',          InternalCreditTransactView.as_view()),
path('internal/users/by-stx-address/<str:stx_address>/', InternalUserByAddressView.as_view()),
```

**Acceptance criteria:**
- `GET /api/users/credits/balance/` returns balance, earned_total, threshold flag, recent events
- `POST /api/internal/credits/transact/` rejects missing `X-Internal-Secret` with 403
- Same `reference_id` twice → second call returns `created: false`, balance unchanged
- Deduct with insufficient balance → 402, no event written
- `is_purchased=True` credits excluded from `earned_total`

---

## Part 2 — Django: Community Pages 🟡 P1

### 2.1 Audit Existing Community Models

Before touching anything:

```bash
python manage.py shell
from communities.models import *
print([m.__name__ for m in Community.__subclasses__()])
Community._meta.get_fields()
```

Add only what is missing. Do not duplicate.

### 2.2 Extend Community Model

```python
# communities/models.py

class Community(models.Model):
    # ── keep all existing fields ──

    # ADD: tier
    TIER_FREE       = 'free'
    TIER_CREATOR    = 'creator'
    TIER_PRO        = 'pro'
    TIER_ENTERPRISE = 'enterprise'
    tier = models.CharField(max_length=20, default='free')

    # ADD: slug for clean /c/:slug URLs
    slug = models.SlugField(unique=True, max_length=80, blank=True)

    # ADD: engagement gating — set True once founder hits earned threshold
    engagement_threshold_met = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            import uuid
            base = slugify(self.name)
            self.slug = base if not Community.objects.filter(slug=base).exists() \
                        else f"{base}-{str(uuid.uuid4())[:8]}"
        super().save(*args, **kwargs)
```

### 2.3 Community Membership Roles

Add if not already present:

```python
class CommunityMembership(models.Model):
    FOUNDER    = 'founder'
    ADMIN      = 'admin'
    MODERATOR  = 'moderator'
    MEMBER     = 'member'
    ROLE_CHOICES = [
        (FOUNDER,   'Founder'),
        (ADMIN,     'Admin'),
        (MODERATOR, 'Moderator'),
        (MEMBER,    'Member'),
    ]

    user      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                  related_name='community_memberships')
    community = models.ForeignKey(Community, on_delete=models.CASCADE,
                                  related_name='memberships')
    role      = models.CharField(max_length=20, choices=ROLE_CHOICES, default=MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('user', 'community')

    @property
    def is_admin_or_above(self):
        return self.role in (self.FOUNDER, self.ADMIN)
```

### 2.4 Community Modules

```python
class CommunityModule(models.Model):
    # Module keys
    ARCADE      = 'arcade'
    CLIPS       = 'clips'
    MEMES       = 'memes'
    NEWSLETTER  = 'newsletter'
    GOVERNANCE  = 'governance'
    TREASURY    = 'treasury'
    AGENT       = 'agent'
    STREAMS     = 'streams'
    MERCH       = 'merch'

    # Minimum tier required per module
    TIER_GATE = {
        ARCADE:     'free',
        CLIPS:      'creator',
        MEMES:      'creator',
        NEWSLETTER: 'creator',
        GOVERNANCE: 'pro',
        TREASURY:   'pro',
        AGENT:      'pro',
        STREAMS:    'pro',
        MERCH:      'creator',
    }
    TIER_ORDER = ['free', 'creator', 'pro', 'enterprise']

    community    = models.ForeignKey(Community, on_delete=models.CASCADE,
                                     related_name='modules')
    module       = models.CharField(max_length=40)
    is_active    = models.BooleanField(default=False)
    activated_at = models.DateTimeField(null=True, blank=True)
    config       = models.JSONField(default=dict)

    class Meta:
        unique_together = ('community', 'module')

    def tier_satisfied(self, community_tier: str) -> bool:
        required = self.TIER_GATE.get(self.module, 'free')
        return self.TIER_ORDER.index(community_tier) >= self.TIER_ORDER.index(required)
```

### 2.5 Feed Event Model

Append-only log. Both Django (governance, membership) and Node.js (games, agents) write here.

```python
class FeedEvent(models.Model):
    MEMBER_JOINED        = 'member_joined'
    GAME_PLAYED          = 'game_played'
    CREDITS_EARNED       = 'credits_earned'
    CONTEST_ENTERED      = 'contest_entered'
    CONTEST_WON          = 'contest_won'
    PROPOSAL_CREATED     = 'proposal_created'
    PROPOSAL_PASSED      = 'proposal_passed'
    AGENT_ACTION         = 'agent_action'
    REWARD_DISTRIBUTED   = 'reward_distributed'
    ANNOUNCEMENT         = 'announcement'

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    community  = models.ForeignKey(Community, on_delete=models.CASCADE,
                                   related_name='feed_events')
    actor      = models.ForeignKey(settings.AUTH_USER_MODEL,
                                   on_delete=models.SET_NULL, null=True, blank=True)
    event_type = models.CharField(max_length=40)
    title      = models.CharField(max_length=200)
    body       = models.TextField(blank=True)
    metadata   = models.JSONField(default=dict)
    source     = models.CharField(max_length=20, default='django')  # 'django' | 'nos'
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes  = [models.Index(fields=['community', '-created_at'])]
```

**Internal feed write endpoint:**

```python
# communities/views.py

class InternalFeedEventView(APIView):
    permission_classes = [InternalServicePermission]

    def post(self, request, slug):
        community = get_object_or_404(Community, slug=slug)
        actor = None
        if actor_id := request.data.get('actor_id'):
            actor = User.objects.filter(id=actor_id).first()

        event = FeedEvent.objects.create(
            community  = community,
            actor      = actor,
            event_type = request.data.get('event_type'),
            title      = request.data.get('title', ''),
            body       = request.data.get('body', ''),
            metadata   = request.data.get('metadata', {}),
            source     = 'nos',
        )
        return Response({'id': str(event.id)}, status=201)
```

**URL:**

```python
# communities/urls.py
path('internal/communities/<slug:slug>/feed/', InternalFeedEventView.as_view()),
path('<slug:slug>/feed/',                      CommunityFeedView.as_view()),
path('<slug:slug>/modules/<str:module>/activate/', ModuleActivationView.as_view()),
```

### 2.6 Module Activation View

```python
class ModuleActivationView(APIView):

    def post(self, request, slug, module):
        community = get_object_or_404(Community, slug=slug)

        membership = CommunityMembership.objects.filter(
            user=request.user,
            community=community,
            is_active=True,
            role__in=['founder', 'admin']
        ).first()
        if not membership:
            return Response({'error': 'Admin or founder required'}, status=403)

        required_tier = CommunityModule.TIER_GATE.get(module)
        if not required_tier:
            return Response({'error': 'Unknown module'}, status=400)

        tier_order = CommunityModule.TIER_ORDER
        if tier_order.index(community.tier) < tier_order.index(required_tier):
            return Response({
                'error': f'{module} requires {required_tier} tier',
                'current_tier': community.tier,
                'required_tier': required_tier,
            }, status=402)

        # Engagement gating for paid-tier modules
        if required_tier in ('creator', 'pro', 'enterprise'):
            if not community.engagement_threshold_met:
                from users.credit_manager import CreditManager
                earned = CreditManager.earned_balance(request.user)
                threshold = settings.CREATOR_ENGAGEMENT_THRESHOLD
                if earned < threshold:
                    return Response({
                        'error': 'Earn more credits through platform activity to unlock this',
                        'earned': earned,
                        'required': threshold,
                    }, status=402)
                community.engagement_threshold_met = True
                community.save()

        mod, _ = CommunityModule.objects.get_or_create(
            community=community, module=module
        )
        mod.is_active    = True
        mod.activated_at = timezone.now()
        mod.save()

        return Response({'status': 'activated', 'module': module})
```

---

## Part 3 — Django: Governance 🟡 P1

### 3.1 Models

```python
# governance/models.py

class Proposal(models.Model):
    TYPE_SPENDING    = 'spending'
    TYPE_RULE_CHANGE = 'rule_change'
    TYPE_ROLE_CHANGE = 'role_change'
    TYPE_AGENT_CONFIG= 'agent_config'
    TYPE_GENERAL     = 'general'

    STATUS_DRAFT    = 'draft'
    STATUS_ACTIVE   = 'active'
    STATUS_PASSED   = 'passed'
    STATUS_REJECTED = 'rejected'
    STATUS_EXECUTED = 'executed'

    id                    = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    community             = models.ForeignKey('communities.Community',
                                              on_delete=models.CASCADE, related_name='proposals')
    created_by            = models.ForeignKey(settings.AUTH_USER_MODEL,
                                              on_delete=models.SET_NULL, null=True)
    title                 = models.CharField(max_length=200)
    description           = models.TextField()
    proposal_type         = models.CharField(max_length=30, default=TYPE_GENERAL)
    status                = models.CharField(max_length=20, default=STATUS_DRAFT)
    voting_starts_at      = models.DateTimeField()
    voting_ends_at        = models.DateTimeField()
    # SECURITY: mandatory delay between pass and execution — prevents flash governance
    execution_delay_hours = models.IntegerField(default=24)
    execute_after         = models.DateTimeField(null=True, blank=True)
    quorum_required       = models.IntegerField(default=10)
    approval_threshold    = models.DecimalField(max_digits=5, decimal_places=2, default=50.00)
    votes_for             = models.IntegerField(default=0)
    votes_against         = models.IntegerField(default=0)
    execution_payload     = models.JSONField(default=dict)
    stacks_tx_id          = models.CharField(max_length=128, blank=True)
    created_at            = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class Vote(models.Model):
    VOTE_FOR      = 'for'
    VOTE_AGAINST  = 'against'
    VOTE_ABSTAIN  = 'abstain'

    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proposal = models.ForeignKey(Proposal, on_delete=models.CASCADE, related_name='votes')
    voter    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    choice   = models.CharField(max_length=10)
    cast_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('proposal', 'voter')
```

### 3.2 Celery Task — Proposal Lifecycle

Add to existing Celery Beat schedule (it's already configured in your project):

```python
# governance/tasks.py

@shared_task
def process_proposals():
    """Runs every 15 minutes. Closes expired votes, marks results, queues execution."""
    now = timezone.now()

    # Close voting on expired active proposals
    for proposal in Proposal.objects.filter(status='active', voting_ends_at__lte=now):
        total = proposal.votes_for + proposal.votes_against
        passed = (
            total >= proposal.quorum_required and
            (proposal.votes_for / total * 100 >= float(proposal.approval_threshold)
             if total > 0 else False)
        )
        proposal.status = 'passed' if passed else 'rejected'
        if passed:
            proposal.execute_after = now + timedelta(hours=proposal.execution_delay_hours)
        proposal.save()

        FeedEvent.objects.create(
            community  = proposal.community,
            event_type = FeedEvent.PROPOSAL_PASSED if passed else 'proposal_rejected',
            title      = f'{"Passed" if passed else "Rejected"}: {proposal.title}',
            metadata   = {'proposal_id': str(proposal.id)},
        )

    # Execute proposals whose time-lock has elapsed
    for proposal in Proposal.objects.filter(status='passed', execute_after__lte=now):
        execute_proposal.delay(str(proposal.id))


@shared_task
def execute_proposal(proposal_id: str):
    proposal = Proposal.objects.get(id=proposal_id)
    if proposal.status != 'passed':
        return
    # Dispatch to handler based on type
    # Role change, agent config etc. handled here
    proposal.status = 'executed'
    proposal.save()
```

```python
# settings.py — add to CELERY_BEAT_SCHEDULE
'process-proposals': {
    'task': 'governance.tasks.process_proposals',
    'schedule': crontab(minute='*/15'),
},
```

### 3.3 Vote Security — Flash Governance Prevention

```python
# governance/views.py

class VoteView(APIView):

    def post(self, request, proposal_id):
        proposal = get_object_or_404(Proposal, id=proposal_id, status='active')

        membership = get_object_or_404(
            CommunityMembership,
            user=request.user,
            community=proposal.community,
            is_active=True,
        )

        # SECURITY: voter must have joined BEFORE the proposal was created
        # Prevents acquiring voting power after seeing a proposal
        if membership.joined_at > proposal.created_at:
            return Response({
                'error': 'You must have been a member before this proposal was created to vote'
            }, status=403)

        if Vote.objects.filter(proposal=proposal, voter=request.user).exists():
            return Response({'error': 'Already voted'}, status=400)

        choice = request.data.get('choice')
        if choice not in ('for', 'against', 'abstain'):
            return Response({'error': 'Invalid choice'}, status=400)

        Vote.objects.create(proposal=proposal, voter=request.user, choice=choice)

        if choice == 'for':
            Proposal.objects.filter(pk=proposal.pk).update(votes_for=F('votes_for') + 1)
        elif choice == 'against':
            Proposal.objects.filter(pk=proposal.pk).update(votes_against=F('votes_against') + 1)

        return Response({'status': 'voted', 'choice': choice})
```

---

## Part 4 — React/TypeScript Frontend

### 4.1 Shared API Types

**Single source of truth. Define once, import everywhere.**

```typescript
// src/types/api.ts

export interface CreditEvent {
  id: string;
  amount: number;           // positive = earned, negative = spent
  source: CreditSource;
  description: string;
  community: string | null; // community slug
  is_purchased: boolean;
  created_at: string;
}

export type CreditSource =
  | 'payment' | 'game' | 'game_entry' | 'contest'
  | 'participation' | 'purchase' | 'tool_use' | 'agent' | 'reward';

export interface CreditsBalance {
  balance: number;
  earned_total: number;
  engagement_threshold_met: boolean;
  recent: CreditEvent[];
}

export interface Community {
  id: string;
  slug: string;
  name: string;
  description: string;
  avatar_url: string;
  banner_url: string;
  tier: 'free' | 'creator' | 'pro' | 'enterprise';
  engagement_threshold_met: boolean;
  member_count: number;
  active_modules: ModuleType[];
  created_at: string;
}

export type ModuleType =
  | 'arcade' | 'clips' | 'memes' | 'newsletter'
  | 'governance' | 'treasury' | 'agent' | 'streams' | 'merch';

export interface Membership {
  community_slug: string;
  role: 'founder' | 'admin' | 'moderator' | 'member';
  joined_at: string;
  is_active: boolean;
}

export interface FeedEvent {
  id: string;
  event_type: string;
  title: string;
  body: string;
  actor: { id: string; display_name: string; avatar_url: string } | null;
  metadata: Record<string, unknown>;
  source: 'django' | 'nos';
  created_at: string;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposal_type: string;
  status: 'draft' | 'active' | 'passed' | 'rejected' | 'executed';
  voting_starts_at: string;
  voting_ends_at: string;
  execute_after: string | null;
  votes_for: number;
  votes_against: number;
  quorum_required: number;
  approval_threshold: number;
  created_by: { id: string; display_name: string };
  created_at: string;
}
```

### 4.2 API Client

Wraps all Django calls. Handles JWT, auto-refresh, typed responses.

```typescript
// src/lib/api.ts

import axios, { AxiosInstance } from 'axios';

const BASE = import.meta.env.VITE_API_URL as string;

class ApiClient {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({ baseURL: BASE });

    this.http.interceptors.request.use(cfg => {
      const token = localStorage.getItem('access_token');
      if (token) cfg.headers!.Authorization = `Bearer ${token}`;
      return cfg;
    });

    this.http.interceptors.response.use(
      r => r,
      async err => {
        const orig = err.config;
        if (err.response?.status === 401 && !orig._retry) {
          orig._retry = true;
          const ok = await this.tryRefresh();
          if (ok) {
            orig.headers.Authorization = `Bearer ${localStorage.getItem('access_token')}`;
            return this.http(orig);
          }
          localStorage.clear();
          window.location.href = '/login';
        }
        return Promise.reject(err);
      }
    );
  }

  private async tryRefresh(): Promise<boolean> {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return false;
    try {
      const { data } = await axios.post(`${BASE}/api/auth/refresh/`, { refresh });
      localStorage.setItem('access_token', data.access);
      return true;
    } catch { return false; }
  }

  async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    const { data } = await this.http.get<T>(path, { params });
    return data;
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const { data } = await this.http.post<T>(path, body);
    return data;
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const { data } = await this.http.patch<T>(path, body);
    return data;
  }

  async delete<T>(path: string): Promise<T> {
    const { data } = await this.http.delete<T>(path);
    return data;
  }
}

export const api = new ApiClient();
```

### 4.3 Credits Hook

```typescript
// src/hooks/useCredits.ts

import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { CreditsBalance } from '../types/api';

export const useCredits = () => {
  const [data, setData]       = useState<CreditsBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<CreditsBalance>('/api/users/credits/balance/');
      setData(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, [refresh]);

  return {
    balance:                  data?.balance ?? 0,
    earnedTotal:              data?.earned_total ?? 0,
    engagementThresholdMet:   data?.engagement_threshold_met ?? false,
    recentEvents:             data?.recent ?? [],
    loading,
    refresh,
  };
};
```

### 4.4 Credits Widget

**Language rule enforced here: never show "DAPs", "DAPP Points", or "tokens". Always "credits".**

```typescript
// src/components/credits/CreditsWidget.tsx

import React from 'react';
import { useCredits } from '../../hooks/useCredits';

const GAME_COST    = 10;
const CONTEST_COST = 50;
const THRESHOLD    = 500;

export const CreditsWidget: React.FC<{ variant: 'pill' | 'panel' }> = ({ variant }) => {
  const { balance, loading } = useCredits();

  if (variant === 'pill') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                      bg-neutral-100 dark:bg-neutral-800 text-sm font-medium">
        <span className="text-amber-500">⚡</span>
        <span className="tabular-nums">{loading ? '—' : balance.toLocaleString()}</span>
        <span className="text-neutral-500 font-normal">credits</span>
      </div>
    );
  }

  return <CreditsPanel />;
};

const CreditsPanel: React.FC = () => {
  const { balance, earnedTotal, engagementThresholdMet, recentEvents, loading } = useCredits();

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 space-y-5">
      <div>
        <p className="text-sm text-neutral-500 mb-1">Your credits</p>
        <p className="text-3xl font-semibold tabular-nums">
          {loading ? '—' : balance.toLocaleString()}
        </p>
        {!loading && balance > 0 && (
          <p className="text-sm text-neutral-400 mt-1">
            Enough for{' '}
            <strong className="text-neutral-700 dark:text-neutral-300">
              {Math.floor(balance / GAME_COST)} game sessions
            </strong>
            {' '}or{' '}
            <strong className="text-neutral-700 dark:text-neutral-300">
              {Math.floor(balance / CONTEST_COST)} contest entries
            </strong>
          </p>
        )}
      </div>

      {!engagementThresholdMet && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-neutral-500">
            <span>Creator tools unlock at {THRESHOLD} earned credits</span>
            <span>{earnedTotal} / {THRESHOLD}</span>
          </div>
          <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((earnedTotal / THRESHOLD) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-neutral-400">
            Play games, enter contests, and participate to earn credits
          </p>
        </div>
      )}

      <div className="space-y-2">
        {recentEvents.slice(0, 5).map(e => (
          <div key={e.id} className="flex justify-between text-sm">
            <span className="text-neutral-500 truncate max-w-[200px]">
              {e.description || sourceLabel(e.source)}
            </span>
            <span className={e.amount > 0
              ? 'text-emerald-600 font-medium tabular-nums'
              : 'text-neutral-400 tabular-nums'
            }>
              {e.amount > 0 ? '+' : ''}{e.amount.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <button className="w-full py-2 rounded-lg border border-neutral-200
                         dark:border-neutral-700 text-sm hover:bg-neutral-50
                         dark:hover:bg-neutral-800 transition-colors">
        Add credits
      </button>
    </div>
  );
};

const sourceLabel = (source: string): string => ({
  payment:      'Transaction',
  game:         'Game payout',
  game_entry:   'Game entry',
  contest:      'Contest',
  participation:'Participation bonus',
  purchase:     'Credits added',
  tool_use:     'Tool used',
  agent:        'Agent activity',
  reward:       'Reward',
}[source] ?? 'Activity');
```

### 4.5 Community Page

```typescript
// src/pages/CommunityPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Community, Membership, ModuleType } from '../types/api';

type Tab = 'feed' | 'games' | 'governance' | 'members';

export const CommunityPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [community, setCommunity]   = useState<Community | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [tab, setTab]               = useState<Tab>('feed');
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      api.get<Community>(`/api/communities/${slug}/`),
      api.get<Membership>(`/api/communities/${slug}/my-membership/`).catch(() => null),
    ]).then(([comm, mem]) => {
      setCommunity(comm);
      setMembership(mem);
      setLoading(false);
    });
  }, [slug]);

  if (loading || !community) return <CommunitySkeleton />;

  const has = (mod: ModuleType) => community.active_modules.includes(mod);

  const tabs: { key: Tab; label: string; visible: boolean }[] = [
    { key: 'feed',       label: 'Feed',       visible: true },
    { key: 'games',      label: 'Games',      visible: has('arcade') },
    { key: 'governance', label: 'Governance', visible: has('governance') },
    { key: 'members',    label: 'Members',    visible: true },
  ];

  const handleJoin = async () => {
    if (!slug) return;
    const mem = await api.post<Membership>(`/api/communities/${slug}/join/`);
    setMembership(mem);
    setCommunity(prev => prev ? { ...prev, member_count: prev.member_count + 1 } : prev);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">
      <CommunityHeader community={community} membership={membership} onJoin={handleJoin} />

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-700 mt-6 mb-4">
        {tabs.filter(t => t.visible).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'feed'       && <CommunityFeedTab slug={slug!} />}
      {tab === 'games'      && has('arcade')     && <ArcadeLobby slug={slug!} />}
      {tab === 'governance' && has('governance') && (
        <GovernancePanel slug={slug!} membership={membership} />
      )}
      {tab === 'members'    && <MemberList slug={slug!} membership={membership} />}
    </div>
  );
};
```

### 4.6 Community Feed Tab

Extend or replace existing `CommunityFeed.tsx` to consume the new typed endpoint.

```typescript
// src/components/community/CommunityFeedTab.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import type { FeedEvent } from '../../types/api';

interface Paginated<T> { results: T[]; next: string | null; }

const EVENT_ICONS: Record<string, string> = {
  game_played:        '🎮',
  credits_earned:     '⚡',
  member_joined:      '👋',
  contest_entered:    '✏️',
  contest_won:        '🏆',
  proposal_created:   '📋',
  proposal_passed:    '✅',
  agent_action:       '🤖',
  reward_distributed: '🎁',
  announcement:       '📣',
};

export const CommunityFeedTab: React.FC<{ slug: string }> = ({ slug }) => {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [nextCursor, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (cursor?: string) => {
    const res = await api.get<Paginated<FeedEvent>>(
      `/api/communities/${slug}/feed/`,
      cursor ? { cursor } : undefined
    );
    setEvents(prev => cursor ? [...prev, ...res.results] : res.results);
    setNext(res.next);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  if (loading) return <FeedSkeleton />;
  if (!events.length) return (
    <p className="text-center text-neutral-400 py-12 text-sm">
      No activity yet — be the first to participate.
    </p>
  );

  return (
    <div className="space-y-3">
      {events.map(event => (
        <div key={event.id}
          className="flex gap-3 p-4 rounded-xl border border-neutral-100
                     dark:border-neutral-800 hover:border-neutral-200
                     dark:hover:border-neutral-700 transition-colors">
          <span className="text-xl flex-shrink-0">
            {EVENT_ICONS[event.event_type] ?? '•'}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {event.title}
            </p>
            {event.body && (
              <p className="text-sm text-neutral-500 mt-0.5">{event.body}</p>
            )}
            <p className="text-xs text-neutral-400 mt-1">
              {new Date(event.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
      {nextCursor && (
        <button onClick={() => load(nextCursor)}
          className="w-full py-3 text-sm text-neutral-500 hover:text-neutral-800">
          Load more
        </button>
      )}
    </div>
  );
};
```

### 4.7 Governance Panel

```typescript
// src/components/governance/GovernancePanel.tsx

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Proposal, Membership } from '../../types/api';

interface Props { slug: string; membership: Membership | null; }

export const GovernancePanel: React.FC<Props> = ({ slug, membership }) => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading]     = useState(true);
  const canPropose = !!membership;

  useEffect(() => {
    api.get<{ results: Proposal[] }>(`/api/communities/${slug}/proposals/`)
      .then(r => { setProposals(r.results); setLoading(false); });
  }, [slug]);

  const castVote = async (proposalId: string, choice: 'for' | 'against') => {
    await api.post(`/api/communities/${slug}/proposals/${proposalId}/vote/`, { choice });
    // Refresh proposal list
    const r = await api.get<{ results: Proposal[] }>(`/api/communities/${slug}/proposals/`);
    setProposals(r.results);
  };

  if (loading) return <div className="py-8 text-center text-sm text-neutral-400">Loading…</div>;

  return (
    <div className="space-y-4">
      {canPropose && (
        <button className="w-full py-2.5 rounded-xl border border-neutral-200
                           dark:border-neutral-700 text-sm font-medium
                           hover:bg-neutral-50 dark:hover:bg-neutral-800">
          + New proposal
        </button>
      )}

      {proposals.map(p => <ProposalCard key={p.id} proposal={p} onVote={castVote} />)}

      {!proposals.length && (
        <p className="text-center text-neutral-400 py-12 text-sm">
          No proposals yet.
        </p>
      )}
    </div>
  );
};

const ProposalCard: React.FC<{
  proposal: Proposal;
  onVote: (id: string, choice: 'for' | 'against') => void;
}> = ({ proposal, onVote }) => {
  const total = proposal.votes_for + proposal.votes_against;
  const pct   = total > 0 ? Math.round((proposal.votes_for / total) * 100) : 0;
  const isActive = proposal.status === 'active';
  const closesIn = isActive
    ? Math.max(0, Math.ceil(
        (new Date(proposal.voting_ends_at).getTime() - Date.now()) / (1000 * 60 * 60)
      ))
    : null;

  return (
    <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">{proposal.title}</p>
          <p className="text-xs text-neutral-500 mt-0.5">
            by {proposal.created_by.display_name}
          </p>
        </div>
        <StatusBadge status={proposal.status} />
      </div>

      {total > 0 && (
        <div>
          <div className="flex justify-between text-xs text-neutral-500 mb-1">
            <span>{pct}% in favour</span>
            <span>{total} votes</span>
          </div>
          <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {isActive && closesIn !== null && (
        <p className="text-xs text-neutral-400">
          Voting closes in {closesIn}h
          {proposal.execute_after && (
            <> · 24h delay after passing before execution</>
          )}
        </p>
      )}

      {isActive && (
        <div className="flex gap-2">
          <button onClick={() => onVote(proposal.id, 'for')}
            className="flex-1 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20
                       text-emerald-700 dark:text-emerald-400 text-sm hover:bg-emerald-100">
            Vote for
          </button>
          <button onClick={() => onVote(proposal.id, 'against')}
            className="flex-1 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20
                       text-red-700 dark:text-red-400 text-sm hover:bg-red-100">
            Vote against
          </button>
        </div>
      )}
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    active:   'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    passed:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    rejected: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    executed: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
    draft:    'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${styles[status] ?? ''}`}>
      {status}
    </span>
  );
};
```

### 4.8 Router Updates

```typescript
// src/App.tsx — add these routes

import { CommunityPage } from './pages/CommunityPage';
import { CreditsPage }   from './pages/CreditsPage';

// Inside your router:
<Route path="/c/:slug"   element={<Protected><CommunityPage /></Protected>} />
<Route path="/credits"   element={<Protected><CreditsPage /></Protected>} />
<Route path="/c/new"     element={<Protected><CreateCommunity /></Protected>} />

// In your global nav/header — add credits pill:
<CreditsWidget variant="pill" />
```

---

## Part 5 — Environment Variables

### Django `.env`

```
NOS_INTERNAL_SECRET=          # Must match Node.js DJANGO_INTERNAL_SECRET exactly
CREATOR_ENGAGEMENT_THRESHOLD=500
GAME_ENTRY_COST=10
PLATFORM_STX_ADDRESS=         # Address users send STX to for credit purchases
```

### React `.env`

```
VITE_API_URL=                 # Django base URL
VITE_PLATFORM_STX_ADDRESS=    # Same as Django PLATFORM_STX_ADDRESS
VITE_STX_PER_CREDIT=0.01
```

---

## Part 6 — Rollout Sequence

### Week 1 — Internal credit plumbing (P0)
- [ ] Extend `DappPointEvent` model with new fields — run migration
- [ ] Build `CreditManager` in `users/credit_manager.py`
- [ ] Build `InternalCreditTransactView` + `InternalUserByAddressView`
- [ ] Build `CreditsBalanceView`
- [ ] Add `InternalServicePermission`
- [ ] Wire all URLs
- [ ] Test with curl: award → balance increases, deduct → decreases, same ref_id → no-op

### Week 2 — Community pages (P1)
- [ ] Audit existing community models (run shell check first)
- [ ] Extend `Community` with `tier`, `slug`, `engagement_threshold_met`
- [ ] Add `CommunityModule`, `CommunityMembership` if absent
- [ ] Add `FeedEvent` model + `InternalFeedEventView`
- [ ] Add module activation endpoint with tier + engagement gating
- [ ] Build `CommunityPage.tsx` + tabs
- [ ] Update router

### Week 3 — Credits UI (P1)
- [ ] Add `src/types/api.ts` shared types
- [ ] Build `src/lib/api.ts` client
- [ ] Build `useCredits` hook
- [ ] Build `CreditsWidget` (pill + panel variants)
- [ ] Add credits pill to global nav
- [ ] Build deposit modal (STX → credits)

### Week 4 — Feed + governance (P1)
- [ ] `CommunityFeedTab` — replaces / extends existing `CommunityFeed.tsx`
- [ ] `GovernancePanel` + `ProposalCard`
- [ ] Add governance Django app + `Proposal` + `Vote` models
- [ ] Wire Celery Beat task for proposal lifecycle
- [ ] Flash governance protection on vote endpoint

### Week 5–6 — Pilot onboarding
- [ ] Create community pages for Bitflow, Xenitron, Skullcoin
- [ ] Activate correct modules per community
- [ ] Confirm Node.js feed events appear in Django feed
- [ ] Confirm Node.js credit awards reflect in balance endpoint
- [ ] End-to-end test: game played → feed event → balance updated → UI reflects

---

## Acceptance Criteria

| Test | Expected |
|---|---|
| Award credits via internal endpoint | Balance increases, `created: true` |
| Same `reference_id` twice | Second call returns `created: false`, balance unchanged |
| Deduct with insufficient balance | 402 returned, no event written |
| `is_purchased=True` credits | Not counted in `earned_total` |
| Module activation on wrong tier | 402 with `required_tier` in response |
| Module activation without earned credits | 402 with `earned` and `required` counts |
| Join community | Membership created with `member` role, count increments |
| Vote before membership pre-dates proposal | 403 returned |
| Proposal passes, execution | `execute_after` is always ≥ 24h after pass time |
| Feed tab | Shows events from both Django and Node.js sources |
| Credits pill | Shows live balance, updates within 60s of any credit event |
| Credits panel | Context line shows equivalent actions, not just a number |
