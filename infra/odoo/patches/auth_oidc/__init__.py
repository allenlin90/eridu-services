# Copyright 2016 ICTSTUDIO <http://www.ictstudio.eu>
# License: AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)
#
# Patched for eridu-services: exposes bootstrap_admin_password as this
# module's post_init_hook (see __manifest__.py and eridu_bootstrap.py).

from . import controllers
from . import models
from .eridu_bootstrap import bootstrap_admin_password
