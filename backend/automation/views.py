from __future__ import annotations

import uuid

from rest_framework import status
from rest_framework.generics import RetrieveAPIView
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import TemplateSet

from .models import AutomationJob, ImageTask
from .pipeline import finalize_job, process_single_image
from .serializers import AutomationJobSerializer

MAX_IMAGES = 35
ALLOWED_UPSCALE = {2, 4}


class AutomationJobCreateView(APIView):
    """POST multipart: images + preset fields — verarbeitet jedes Motiv synchron in der Pipeline."""

    permission_classes = (IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        ai_model_name = (request.data.get("ai_model_name") or "").strip()
        mockup_set = (request.data.get("mockup_set") or "").strip()
        gelato_profile = (request.data.get("gelato_profile") or "").strip()
        factor_raw = request.data.get("upscale_factor", "4")

        try:
            upscale_factor = int(factor_raw)
        except (TypeError, ValueError):
            return Response(
                {"detail": "upscale_factor muss 2 oder 4 sein."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if upscale_factor not in ALLOWED_UPSCALE:
            return Response(
                {"detail": "upscale_factor muss 2 oder 4 sein."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not ai_model_name:
            return Response(
                {"detail": "ai_model_name ist erforderlich."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not mockup_set:
            return Response(
                {"detail": "mockup_set ist erforderlich."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            mockup_uuid = uuid.UUID(mockup_set)
        except ValueError:
            return Response(
                {"detail": "mockup_set muss die UUID eines Vorlagen-Sets sein."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not TemplateSet.objects.filter(id=mockup_uuid, user=request.user).exists():
            return Response(
                {"detail": "Vorlagen-Set unbekannt oder gehoert nicht zu deinem Account."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not gelato_profile:
            return Response(
                {"detail": "gelato_profile ist erforderlich."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        images = request.FILES.getlist("images")
        if not images:
            return Response(
                {"detail": "Mindestens ein Bild (images) ist erforderlich."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(images) > MAX_IMAGES:
            return Response(
                {"detail": f"Maximal {MAX_IMAGES} Bilder erlaubt."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        job = AutomationJob.objects.create(
            user=request.user,
            status=AutomationJob.Status.PROCESSING,
            ai_model_name=ai_model_name,
            upscale_factor=upscale_factor,
            mockup_set=str(mockup_uuid),
            gelato_profile=gelato_profile,
        )

        task_ids: list[str] = []
        for f in images:
            t = ImageTask.objects.create(job=job, original_image=f)
            task_ids.append(str(t.id))

        for tid in task_ids:
            process_single_image(str(tid))

        finalize_job(str(job.id))

        job = (
            AutomationJob.objects.prefetch_related("tasks")
            .filter(pk=job.pk)
            .first()
        )
        ser = AutomationJobSerializer(job, context={"request": request})
        return Response(ser.data, status=status.HTTP_201_CREATED)


class AutomationJobDetailView(RetrieveAPIView):
    """GET — polling target for job + nested tasks."""

    permission_classes = (IsAuthenticated,)
    serializer_class = AutomationJobSerializer

    def get_queryset(self):
        return AutomationJob.objects.filter(user=self.request.user).prefetch_related(
            "tasks",
        )
